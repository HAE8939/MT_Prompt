import type { PrismaClient } from "@prisma/client";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

export type IntegrityReport = { checkedAt: string; assetCount: number; missingFiles: string[]; orphanFiles: string[] };

export class IntegrityService {
  constructor(private readonly prisma: PrismaClient, private readonly storageRoot: string) {}

  async scan(): Promise<IntegrityReport> {
    const assets = await this.prisma.asset.findMany({ select: { storageKey: true } });
    const recorded = new Set(assets.map((asset) => asset.storageKey.replace(/\\/g, "/")));
    const files = await walk(this.storageRoot);
    const actual = new Set(files.map((file) => relative(this.storageRoot, file).replace(/\\/g, "/")));
    return {
      checkedAt: new Date().toISOString(),
      assetCount: assets.length,
      missingFiles: [...recorded].filter((key) => !actual.has(key)).sort(),
      orphanFiles: [...actual].filter((key) => !recorded.has(key) && !key.endsWith(".tmp")).sort(),
    };
  }
}

async function walk(root: string): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? walk(join(root, entry.name)) : Promise.resolve([join(root, entry.name)])));
    return nested.flat();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
