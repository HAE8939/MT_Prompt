import type { Prisma, PrismaClient } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { access, copyFile, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { unzipSync } from "fflate";
import type { ExportService } from "./export.service.js";

type ManifestEntry = { name: string; size: number; sha256: string };
type Manifest = { schemaVersion: number; promptCount: number; missingAssets?: string[]; entries: ManifestEntry[] };
type ArchiveRecord = Record<string, unknown>;
type ParsedArchive = {
  archive: Record<string, Uint8Array>;
  manifest: Manifest;
  prompts: ArchiveRecord[];
  knowledge: {
    models: ArchiveRecord[];
    templates: ArchiveRecord[];
    skills: ArchiveRecord[];
    personalRules: ArchiveRecord[];
    categories: ArchiveRecord[];
    tags: ArchiveRecord[];
    compilationRuns: ArchiveRecord[];
  };
};

export type ImportMode = "MERGE" | "REPLACE";
export type ImportValidation = { valid: true; schemaVersion: number; promptCount: number; assetCount: number; missingAssets: string[]; entries: string[] };
export type ImportPreview = ImportValidation & { conflicts: string[] };

const KNOWLEDGE_KEYS = ["models", "templates", "skills", "personalRules", "categories", "tags"] as const;

export class ImportService {
  constructor(
    private readonly prisma?: PrismaClient,
    private readonly storageRoot?: string,
    private readonly exporter?: Pick<ExportService, "createExport">,
  ) {}

  validate(buffer: Buffer): ImportValidation {
    const parsed = this.parse(buffer);
    const names = Object.keys(parsed.archive);
    return {
      valid: true,
      schemaVersion: parsed.manifest.schemaVersion,
      promptCount: parsed.prompts.length,
      assetCount: names.filter((name) => name.startsWith("assets/") && !name.endsWith("/")).length,
      missingAssets: parsed.manifest.missingAssets ?? [],
      entries: names.sort(),
    };
  }

  async preview(buffer: Buffer): Promise<ImportPreview> {
    const validation = this.validate(buffer);
    const prisma = this.requirePrisma();
    const parsed = this.parse(buffer);
    const ids = parsed.prompts.map((prompt) => requiredString(prompt, "id"));
    const existing = ids.length ? await prisma.prompt.findMany({ where: { id: { in: ids } }, select: { id: true } }) : [];
    return { ...validation, conflicts: existing.map(({ id }) => id) };
  }

  async restore(buffer: Buffer, mode: ImportMode) {
    const prisma = this.requirePrisma();
    const storageRoot = this.requireStorageRoot();
    const parsed = this.parse(buffer);
    const preview = await this.preview(buffer);
    if (mode === "REPLACE") {
      if (!this.exporter) throw new Error("IMPORT_PRE_BACKUP_REQUIRED");
      try { await this.exporter.createExport(); }
      catch { throw new Error("IMPORT_PRE_BACKUP_FAILED"); }
    }

    const skippedPromptIds = mode === "MERGE" ? new Set(preview.conflicts) : new Set<string>();
    const stageRoot = join(storageRoot, ".import", randomUUID());
    const stagedAssets = await this.stageAssets(parsed, stageRoot, skippedPromptIds);
    const assetJournal: AssetJournalEntry[] = [];
    try {
      await prisma.$transaction(async (tx) => {
        if (mode === "REPLACE") await clearDatabase(tx);
        await restoreKnowledge(tx, parsed.knowledge);
        await restoreCompilations(tx, parsed.knowledge.compilationRuns);
        await restorePrompts(tx, parsed.prompts, skippedPromptIds);
        if (mode === "REPLACE") await clearStorageForReplace(storageRoot, join(stageRoot, ".rollback"), assetJournal);
        await publishAssets(stagedAssets, storageRoot, join(stageRoot, ".rollback"), assetJournal);
      });
    } catch (error) {
      await rollbackAssets(assetJournal);
      throw error;
    } finally {
      await rm(stageRoot, { recursive: true, force: true });
    }

    return {
      mode,
      promptCount: parsed.prompts.length,
      assetCount: this.validate(buffer).assetCount,
      restoredAssets: stagedAssets.length,
      conflicts: preview.conflicts,
      missingAssets: parsed.manifest.missingAssets ?? [],
    };
  }

  private parse(buffer: Buffer): ParsedArchive {
    let archive: Record<string, Uint8Array>;
    try { archive = unzipSync(buffer); } catch { throw new Error("IMPORT_INVALID_ZIP"); }
    const names = Object.keys(archive);
    if (names.some(isUnsafeArchivePath)) throw new Error("IMPORT_UNSAFE_PATH");
    const manifest = parseJson<Manifest>(archive["manifest.json"], "IMPORT_MANIFEST_REQUIRED");
    if (manifest.schemaVersion !== 1) throw new Error("IMPORT_SCHEMA_UNSUPPORTED");
    if (!Array.isArray(manifest.entries)) throw new Error("IMPORT_MANIFEST_INVALID");
    const declared = new Set(manifest.entries.map((entry) => entry?.name));
    const payloadNames = names.filter((name) => name !== "manifest.json" && !name.endsWith("/"));
    if (payloadNames.some((name) => !declared.has(name)) || manifest.entries.some((entry) => !archive[entry.name])) throw new Error("IMPORT_MANIFEST_INCOMPLETE");
    const prompts = parseJson<unknown>(archive["prompts.json"], "IMPORT_PROMPTS_REQUIRED");
    const knowledge = parseJson<unknown>(archive["knowledge.json"], "IMPORT_KNOWLEDGE_REQUIRED");
    if (!Array.isArray(prompts)) throw new Error("IMPORT_PROMPTS_INVALID");
    if (!isRecord(knowledge) || KNOWLEDGE_KEYS.some((key) => !Array.isArray(knowledge[key]))) throw new Error("IMPORT_KNOWLEDGE_INVALID");
    for (const entry of manifest.entries) {
      if (!entry || typeof entry.name !== "string" || isUnsafeArchivePath(entry.name)) throw new Error("IMPORT_MANIFEST_INVALID");
      const data = archive[entry.name];
      if (!data || data.byteLength !== entry.size || createHash("sha256").update(data).digest("hex") !== entry.sha256) throw new Error("IMPORT_CHECKSUM_MISMATCH");
    }
    return { archive, manifest, prompts: prompts as ArchiveRecord[], knowledge: { ...(knowledge as Omit<ParsedArchive["knowledge"], "compilationRuns">), compilationRuns: Array.isArray(knowledge.compilationRuns) ? knowledge.compilationRuns as ArchiveRecord[] : [] } };
  }

  private async stageAssets(parsed: ParsedArchive, stageRoot: string, skippedPromptIds: Set<string>) {
    const staged: Array<{ source: string; storageKey: string }> = [];
    for (const prompt of parsed.prompts) {
      if (skippedPromptIds.has(requiredString(prompt, "id"))) continue;
      const assets = Array.isArray(prompt.assets) ? prompt.assets : [];
      for (const value of assets) {
        if (!isRecord(value)) throw new Error("IMPORT_ASSET_INVALID");
        const storageKey = requiredString(value, "storageKey").replace(/\\/g, "/");
        if (isUnsafeArchivePath(storageKey)) throw new Error("IMPORT_UNSAFE_PATH");
        const data = parsed.archive[`assets/${storageKey}`];
        if (!data) continue;
        const source = join(stageRoot, storageKey);
        await mkdir(dirname(source), { recursive: true });
        await writeFile(source, data);
        staged.push({ source, storageKey });
      }
    }
    return staged;
  }

  private requirePrisma() {
    if (!this.prisma) throw new Error("IMPORT_DATABASE_REQUIRED");
    return this.prisma;
  }

  private requireStorageRoot() {
    if (!this.storageRoot) throw new Error("IMPORT_STORAGE_REQUIRED");
    return this.storageRoot;
  }
}

async function clearDatabase(tx: Prisma.TransactionClient) {
  await tx.prompt.deleteMany();
  await tx.compilationSkill.deleteMany();
  await tx.compilationRun.deleteMany();
  await tx.templateSkill.deleteMany();
  await tx.skillModelTask.deleteMany();
  await tx.personalRule.deleteMany();
  await tx.promptTemplate.deleteMany();
  await tx.promptSkill.deleteMany();
  await tx.modelTask.deleteMany();
  await tx.model.deleteMany();
  await tx.tag.deleteMany();
  await tx.category.updateMany({ data: { parentId: null } });
  await tx.category.deleteMany();
}

async function restoreKnowledge(tx: Prisma.TransactionClient, knowledge: ParsedArchive["knowledge"]) {
  for (const raw of knowledge.categories) {
    const data = omit(raw, ["parent", "children", "prompts", "parentId"]);
    const id = requiredString(raw, "id");
    await tx.category.upsert({ where: { id }, create: data as Prisma.CategoryUncheckedCreateInput, update: data as Prisma.CategoryUncheckedUpdateInput });
  }
  for (const raw of knowledge.categories) {
    if (typeof raw.parentId === "string") await tx.category.update({ where: { id: requiredString(raw, "id") }, data: { parentId: raw.parentId } });
  }
  for (const raw of knowledge.tags) {
    const data = omit(raw, ["prompts"]);
    const id = requiredString(raw, "id");
    await tx.tag.upsert({ where: { id }, create: data as Prisma.TagUncheckedCreateInput, update: data as Prisma.TagUncheckedUpdateInput });
  }
  for (const raw of knowledge.models) {
    const data = omit(raw, ["tasks"]);
    const id = requiredString(raw, "id");
    await tx.model.upsert({ where: { id }, create: data as Prisma.ModelUncheckedCreateInput, update: data as Prisma.ModelUncheckedUpdateInput });
    for (const task of arrayRecords(raw.tasks)) {
      const taskData = omit(task, ["model", "prompts", "templates", "skills", "personalRules", "compilations"]);
      const taskId = requiredString(task, "id");
      await tx.modelTask.upsert({ where: { id: taskId }, create: taskData as Prisma.ModelTaskUncheckedCreateInput, update: taskData as Prisma.ModelTaskUncheckedUpdateInput });
    }
  }
  for (const raw of knowledge.templates) {
    const data = omit(raw, ["modelTask", "recommendedSkills", "compilations"]);
    const id = requiredString(raw, "id");
    await tx.promptTemplate.upsert({ where: { id }, create: data as Prisma.PromptTemplateUncheckedCreateInput, update: data as Prisma.PromptTemplateUncheckedUpdateInput });
  }
  for (const raw of knowledge.skills) {
    const data = omit(raw, ["modelTasks", "recommendedFor", "compilations"]);
    const id = requiredString(raw, "id");
    await tx.promptSkill.upsert({ where: { id }, create: data as Prisma.PromptSkillUncheckedCreateInput, update: data as Prisma.PromptSkillUncheckedUpdateInput });
    await tx.skillModelTask.deleteMany({ where: { skillId: id } });
    const links = arrayRecords(raw.modelTasks).map((link) => ({ skillId: id, modelTaskId: requiredString(link, "modelTaskId") }));
    if (links.length) await tx.skillModelTask.createMany({ data: links });
  }
  for (const raw of knowledge.templates) {
    const templateId = requiredString(raw, "id");
    await tx.templateSkill.deleteMany({ where: { templateId } });
    const links = arrayRecords(raw.recommendedSkills).map((link) => ({ templateId, skillId: requiredString(link, "skillId"), required: Boolean(link.required) }));
    if (links.length) await tx.templateSkill.createMany({ data: links });
  }
  for (const raw of knowledge.personalRules) {
    const data = omit(raw, ["modelTask"]);
    const id = requiredString(raw, "id");
    await tx.personalRule.upsert({ where: { id }, create: data as Prisma.PersonalRuleUncheckedCreateInput, update: data as Prisma.PersonalRuleUncheckedUpdateInput });
  }
}

async function restorePrompts(tx: Prisma.TransactionClient, prompts: ArchiveRecord[], skippedPromptIds: Set<string>) {
  for (const raw of prompts) {
    const promptId = requiredString(raw, "id");
    if (skippedPromptIds.has(promptId)) continue;
    const data = omit(raw, ["tags", "assets", "versions", "modelTask", "category", "compilationRun"]);
    await tx.prompt.upsert({ where: { id: promptId }, create: data as Prisma.PromptUncheckedCreateInput, update: data as Prisma.PromptUncheckedUpdateInput });
    await tx.promptTag.deleteMany({ where: { promptId } });
    const tagLinks = arrayRecords(raw.tags).map((link) => ({ promptId, tagId: requiredString(link, "tagId") }));
    if (tagLinks.length) await tx.promptTag.createMany({ data: tagLinks });
    await tx.asset.deleteMany({ where: { promptId } });
    for (const asset of arrayRecords(raw.assets)) {
      const assetId = requiredString(asset, "id");
      const assetData = omit(asset, ["prompt"]);
      await tx.asset.upsert({ where: { id: assetId }, create: assetData as Prisma.AssetUncheckedCreateInput, update: assetData as Prisma.AssetUncheckedUpdateInput });
    }
    await tx.promptVersion.deleteMany({ where: { promptId } });
    for (const version of arrayRecords(raw.versions)) {
      const versionId = requiredString(version, "id");
      const versionData = omit(version, ["prompt"]);
      await tx.promptVersion.upsert({ where: { id: versionId }, create: versionData as Prisma.PromptVersionUncheckedCreateInput, update: versionData as Prisma.PromptVersionUncheckedUpdateInput });
    }
  }
}

async function restoreCompilations(tx: Prisma.TransactionClient, runs: ArchiveRecord[]) {
  for (const raw of runs) {
    const id = requiredString(raw, "id");
    const data = omit(raw, ["skills", "prompt", "modelTask", "template"]);
    await tx.compilationRun.upsert({ where: { id }, create: data as Prisma.CompilationRunUncheckedCreateInput, update: data as Prisma.CompilationRunUncheckedUpdateInput });
    await tx.compilationSkill.deleteMany({ where: { compilationRunId: id } });
    const skills = arrayRecords(raw.skills).map((skill) => omit(skill, ["compilationRun", "skill"]) as Prisma.CompilationSkillUncheckedCreateInput);
    if (skills.length) await tx.compilationSkill.createMany({ data: skills });
  }
}

type AssetJournalEntry = { destination: string; backup?: string };

async function publishAssets(assets: Array<{ source: string; storageKey: string }>, storageRoot: string, rollbackRoot: string, journal: AssetJournalEntry[]) {
  for (const asset of assets) {
    const destination = join(storageRoot, asset.storageKey);
    await mkdir(dirname(destination), { recursive: true });
    let backup: string | undefined;
    try {
      await access(destination);
      backup = join(rollbackRoot, asset.storageKey);
      await mkdir(dirname(backup), { recursive: true });
      await copyFile(destination, backup);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    journal.push({ destination, backup });
    await copyFile(asset.source, destination);
  }
}

async function rollbackAssets(journal: AssetJournalEntry[]) {
  for (const entry of [...journal].reverse()) {
    if (entry.backup) await copyFile(entry.backup, entry.destination);
    else await rm(entry.destination, { force: true });
  }
}

async function clearStorageForReplace(storageRoot: string, rollbackRoot: string, journal: AssetJournalEntry[]) {
  for (const file of await listStorageFiles(storageRoot)) {
    const backup = join(rollbackRoot, file.slice(storageRoot.length + 1));
    await mkdir(dirname(backup), { recursive: true });
    await copyFile(file, backup);
    journal.push({ destination: file, backup });
    await rm(file, { force: true });
  }
}

async function listStorageFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true }).catch(() => [] as Awaited<ReturnType<typeof readdir>>)) {
    const name = String(entry.name);
    if (name === ".import") continue;
    const path = join(root, name);
    if (entry.isDirectory()) files.push(...await listStorageFiles(path));
    else files.push(path);
  }
  return files;
}

function parseJson<T>(value: Uint8Array | undefined, errorCode: string): T {
  if (!value) throw new Error(errorCode);
  try { return JSON.parse(Buffer.from(value).toString("utf8")) as T; } catch { throw new Error(errorCode); }
}

function isUnsafeArchivePath(value: string) {
  const normalized = value.replace(/\\/g, "/");
  return normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized) || normalized.split("/").includes("..");
}

function isRecord(value: unknown): value is ArchiveRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function arrayRecords(value: unknown): ArchiveRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function requiredString(record: ArchiveRecord, key: string) {
  const value = record[key];
  if (typeof value !== "string" || !value) throw new Error("IMPORT_DATA_INVALID");
  return value;
}

function omit(record: ArchiveRecord, keys: string[]) {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !keys.includes(key)));
}
