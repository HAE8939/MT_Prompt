import type { PrismaClient } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { createZip } from "./zip.js";

type Entry = { name: string; data: Buffer };

export class ExportService {
  constructor(private readonly prisma: PrismaClient, private readonly storageRoot: string, private readonly exportRoot: string) {}

  async createExport() {
    const [prompts, models, templates, skills, personalRules, categories, tags, compilationRuns] = await Promise.all([
      this.prisma.prompt.findMany({ include: { tags: { include: { tag: true } }, assets: true, versions: true }, orderBy: { createdAt: "asc" } }),
      this.prisma.model.findMany({ include: { tasks: true }, orderBy: { order: "asc" } }),
      this.prisma.promptTemplate.findMany({ include: { recommendedSkills: true }, orderBy: [{ stableKey: "asc" }, { version: "asc" }] }),
      this.prisma.promptSkill.findMany({ include: { modelTasks: true }, orderBy: [{ stableKey: "asc" }, { version: "asc" }] }),
      this.prisma.personalRule.findMany({ orderBy: [{ stableKey: "asc" }, { version: "asc" }] }),
      this.prisma.category.findMany({ orderBy: { name: "asc" } }),
      this.prisma.tag.findMany({ orderBy: { name: "asc" } }),
      this.prisma.compilationRun.findMany({ include: { skills: true }, orderBy: { createdAt: "asc" } }),
    ]);
    const json = (value: unknown) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    const entries: Entry[] = [
      { name: "prompts.json", data: json(prompts) },
      { name: "knowledge.json", data: json({ models, templates, skills, personalRules, categories, tags, compilationRuns }) },
    ];
    const missingAssets: string[] = [];
    for (const asset of prompts.flatMap((prompt) => prompt.assets)) {
      try {
        entries.push({ name: `assets/${asset.storageKey.replace(/\\/g, "/")}`, data: await readFile(join(this.storageRoot, asset.storageKey)) });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        missingAssets.push(asset.storageKey);
      }
    }
    const exportedAt = new Date();
    const manifest = {
      schemaVersion: 1,
      exportedAt: exportedAt.toISOString(),
      promptCount: prompts.length,
      missingAssets,
      entries: entries.map((entry) => ({ name: entry.name, size: entry.data.length, sha256: createHash("sha256").update(entry.data).digest("hex") })),
    };
    entries.unshift({ name: "manifest.json", data: json(manifest) });

    const filename = `promptvault-${exportedAt.toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}.zip`;
    const tempRoot = join(this.exportRoot, ".tmp");
    const tempPath = join(tempRoot, filename);
    const finalPath = join(this.exportRoot, filename);
    await mkdir(tempRoot, { recursive: true });
    await writeFile(tempPath, createZip(entries));
    await rename(tempPath, finalPath);
    return { filename, path: finalPath };
  }

  resolve(filename: string) {
    if (basename(filename) !== filename || !/^promptvault-[\w.-]+\.zip$/.test(filename)) throw new Error("EXPORT_NOT_FOUND");
    return join(this.exportRoot, filename);
  }
}
