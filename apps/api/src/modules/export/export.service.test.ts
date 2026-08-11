import { PrismaClient } from "@prisma/client";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { ExportService } from "./export.service.js";

const prisma = new PrismaClient();

describe("ExportService", () => {
  afterAll(async () => prisma.$disconnect());

  it("exports a versioned manifest, records, knowledge, and assets", async () => {
    const root = await mkdtemp(join(tmpdir(), "promptvault-export-"));
    const exportRoot = join(root, "exports");
    const service = new ExportService(prisma, join(root, "storage"), exportRoot);

    try {
      const archive = await service.createExport();
      const buffer = await readFile(archive.path);
      expect(buffer.subarray(0, 2).toString()).toBe("PK");
      expect(listEntries(buffer)).toEqual(expect.arrayContaining(["manifest.json", "prompts.json", "knowledge.json"]));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

function listEntries(buffer: Buffer) {
  const names: string[] = [];
  for (let offset = 0; offset <= buffer.length - 46; offset += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) continue;
    const nameLength = buffer.readUInt16LE(offset + 28);
    names.push(buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8"));
  }
  return names;
}
