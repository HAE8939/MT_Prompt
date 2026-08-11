import { readFile, readFile as readBinary } from "node:fs/promises";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { LocalStorageAdapter } from "../apps/api/src/modules/assets/local-storage-adapter.js";

export type CiyuanEntry = { index: number; title: string; coverFile: string; beforeFile?: string; promptText: string };

export async function parseCiyuanMarkdown(markdownPath: string): Promise<CiyuanEntry[]> {
  const source = await readFile(resolve(markdownPath), "utf8");
  const blocks = source.split(/(?=^##\s+\d+\s+·\s+)/m).filter((block) => /^##\s+\d+\s+·\s+/m.test(block));
  return blocks.map((block) => {
    const heading = block.match(/^##\s+(\d+)\s+·\s+(.+)$/m);
    const images = [...block.matchAll(/!\[[^\]]*\]\([^)]+\/(\d+(?:_before)?\.webp)\)/g)].map((match) => match[1]!);
    const firstImage = block.indexOf("![");
    const firstPrompt = block.indexOf("\n", firstImage);
    const text = block.slice(firstPrompt + 1).split(/\n---\s*$/m)[0].trim();
    if (!heading || !images[0]) throw new Error(`Invalid ciyuan entry: ${block.slice(0, 80)}`);
    return { index: Number(heading[1]), title: heading[2].trim(), coverFile: images.find((file) => !file.includes("_before")) ?? images[0], beforeFile: images.find((file) => file.includes("_before")), promptText: text };
  });
}

async function importEntries() {
  const root = resolve(process.cwd());
  const sourceDir = join(root, "ciyuan01");
  const entries = await parseCiyuanMarkdown(join(sourceDir, "ciyuan01_gpt-image2_prompts.md"));
  const prisma = new PrismaClient();
  const storage = new LocalStorageAdapter(join(root, "storage"));
  try {
    const generateTask = await prisma.modelTask.findUniqueOrThrow({ where: { stableKey: "gpt-image-2-image-generate" } });
    const editTask = await prisma.modelTask.findUniqueOrThrow({ where: { stableKey: "gpt-image-2-scene-preserving-edit" } });
    for (const entry of entries) {
      const modelTask = /上传|保留原始|改造前|参考/.test(entry.promptText) ? editTask : generateTask;
      const existing = await prisma.prompt.findFirst({ where: { title: entry.title, modelTaskId: modelTask.id } });
      const prompt = existing ?? await prisma.prompt.create({ data: { title: entry.title, description: `词源零壹精选提示词 #${String(entry.index).padStart(2, "0")}`, contentZh: entry.promptText, contentEn: null, modelTaskId: modelTask.id, origin: "GENERATED", status: "VERIFIED", rating: 0 } });
      if (!existing) await prisma.promptVersion.create({ data: { promptId: prompt.id, version: 1, snapshot: { contentZh: entry.promptText, contentEn: null }, changeNote: "导入词源零壹精选提示词" } });
      const assetCount = await prisma.asset.count({ where: { promptId: prompt.id } });
      if (assetCount === 0) {
        const imageDir = join(sourceDir, "ciyuan01_prompt_images");
        const cover = await storage.put({ buffer: await readBinary(join(imageDir, entry.coverFile)), extension: "webp", role: "COVER" });
        await prisma.asset.create({ data: { promptId: prompt.id, role: "COVER", storageKey: cover.key, mimeType: "image/webp", originalName: entry.coverFile, byteSize: cover.byteSize, checksum: cover.checksum } });
        if (entry.beforeFile) {
          const before = await storage.put({ buffer: await readBinary(join(imageDir, entry.beforeFile)), extension: "webp", role: "REFERENCE" });
          await prisma.asset.create({ data: { promptId: prompt.id, role: "REFERENCE", storageKey: before.key, mimeType: "image/webp", originalName: entry.beforeFile, byteSize: before.byteSize, checksum: before.checksum } });
        }
      }
    }
    console.log(`Imported ${entries.length} ciyuan01 prompts.`);
  } finally { await prisma.$disconnect(); }
}

if (process.argv[1]?.endsWith("import-ciyuan01.ts")) importEntries().catch((error) => { console.error(error); process.exit(1); });
