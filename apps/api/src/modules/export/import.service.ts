import { createHash } from "node:crypto";
import { unzipSync } from "fflate";

type Manifest = { schemaVersion: number; promptCount: number; missingAssets?: string[]; entries: Array<{ name: string; size: number; sha256: string }> };
export type ImportValidation = { valid: true; schemaVersion: number; promptCount: number; assetCount: number; missingAssets: string[]; entries: string[] };

export class ImportService {
  validate(buffer: Buffer): ImportValidation {
    let archive: Record<string, Uint8Array>;
    try { archive = unzipSync(buffer); } catch { throw new Error("IMPORT_INVALID_ZIP"); }
    const names = Object.keys(archive);
    if (names.some((name) => name.startsWith("/") || name.includes("../") || name.includes("..\\"))) throw new Error("IMPORT_UNSAFE_PATH");
    const manifest = parseJson<Manifest>(archive["manifest.json"], "IMPORT_MANIFEST_REQUIRED");
    if (manifest.schemaVersion !== 1) throw new Error("IMPORT_SCHEMA_UNSUPPORTED");
    parseJson(archive["prompts.json"], "IMPORT_PROMPTS_REQUIRED");
    parseJson(archive["knowledge.json"], "IMPORT_KNOWLEDGE_REQUIRED");
    for (const entry of manifest.entries) {
      const data = archive[entry.name];
      if (!data || data.byteLength !== entry.size || createHash("sha256").update(data).digest("hex") !== entry.sha256) throw new Error("IMPORT_CHECKSUM_MISMATCH");
    }
    return { valid: true, schemaVersion: manifest.schemaVersion, promptCount: manifest.promptCount, assetCount: names.filter((name) => name.startsWith("assets/")).length, missingAssets: manifest.missingAssets ?? [], entries: names.sort() };
  }
}

function parseJson<T>(value: Uint8Array | undefined, errorCode: string): T {
  if (!value) throw new Error(errorCode);
  try { return JSON.parse(Buffer.from(value).toString("utf8")) as T; } catch { throw new Error(errorCode); }
}
