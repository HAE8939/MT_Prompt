import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { join, normalize, relative, sep } from "node:path";
import { randomUUID } from "node:crypto";
import type { AssetRole, StorageAdapter, StoredObject } from "./storage-adapter.js";

const roleDirectory: Record<AssetRole, string> = { COVER: "cover", REFERENCE: "reference", RESULT: "result", COMPARISON: "comparison" };

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly root: string) {}

  async put(input: { buffer: Buffer; extension: string; role: AssetRole }): Promise<StoredObject> {
    const now = new Date();
    const relativeDirectory = join("images", String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"), roleDirectory[input.role]);
    const directory = join(this.root, relativeDirectory);
    await mkdir(directory, { recursive: true });
    const fileName = `${randomUUID()}.${input.extension.replace(/[^a-z0-9]/gi, "") || "bin"}`;
    const key = join(relativeDirectory, fileName).replaceAll("\\", "/");
    const finalPath = join(this.root, key);
    const tempPath = `${finalPath}.tmp`;
    await writeFile(tempPath, input.buffer, { flag: "wx" });
    await rename(tempPath, finalPath);
    return { key, byteSize: input.buffer.byteLength, checksum: createHash("sha256").update(input.buffer).digest("hex") };
  }

  private resolve(key: string) {
    const root = normalize(this.root);
    const candidate = normalize(join(root, key));
    const rel = relative(root, candidate);
    if (rel.startsWith("..") || rel.includes(`..${sep}`)) throw new Error("INVALID_STORAGE_KEY");
    return candidate;
  }

  async remove(key: string) { await rm(this.resolve(key), { force: true }); }
  async exists(key: string) { try { await access(this.resolve(key)); return true; } catch { return false; } }
  async createReadStream(key: string) { return createReadStream(this.resolve(key)); }
}
