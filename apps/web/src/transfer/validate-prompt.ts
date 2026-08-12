import { unzipSync, strFromU8 } from "fflate";
import type { InterfaceSettings, KnowledgeRecord, PromptAsset, PromptRecord, PromptVersion } from "../domain/types";
import { blobBytes, sha256 } from "./hash";
import { PACKAGE_LIMITS, PromptPackageError, type PromptManifest } from "./package-format";
type AssetMetadata = Omit<PromptAsset, "blob"> & { path: string };
export type ValidatedPromptPackage = { manifest: PromptManifest; files: Record<string, Uint8Array>; prompts: PromptRecord[]; assets: PromptAsset[]; versions: PromptVersion[]; knowledge: KnowledgeRecord[]; interfaceSettings?: InterfaceSettings };
function parseJson<T>(files: Record<string, Uint8Array>, path: string, fallback?: T): T {
  const bytes = files[path]; if (!bytes) { if (fallback !== undefined) return fallback; throw new PromptPackageError("ENTRY_MISSING", `Missing entry ${path}.`); }
  try { return JSON.parse(strFromU8(bytes)) as T; } catch { throw new PromptPackageError("MALFORMED_JSON", `Invalid JSON in ${path}.`); }
}
function containsProviderConfiguration(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, nested]) => ["provider", "providersettings", "apikey", "baseurl", "providerurl"].includes(key.toLowerCase()) || containsProviderConfiguration(nested));
}
export async function validatePromptPackage(blob: Blob): Promise<ValidatedPromptPackage> {
  if (blob.size > PACKAGE_LIMITS.compressedBytes) throw new PromptPackageError("PACKAGE_TOO_LARGE", "Package is too large.");
  const files = unzipSync(await blobBytes(blob));
  const names = Object.keys(files); if (names.length > PACKAGE_LIMITS.entries) throw new PromptPackageError("TOO_MANY_ENTRIES", "Too many entries.");
  if (names.some((name) => name.startsWith("/") || name.split("/").includes(".."))) throw new PromptPackageError("UNSAFE_ENTRY_PATH", "Unsafe entry path.");
  if (!files["manifest.json"]) throw new PromptPackageError("MANIFEST_MISSING", "Manifest is missing.");
  let manifest: PromptManifest; try { manifest = JSON.parse(strFromU8(files["manifest.json"])) as PromptManifest; } catch { throw new PromptPackageError("MALFORMED_JSON", "Manifest is invalid."); }
  if (manifest.format !== "mt-prompt" || manifest.version !== 1) throw new PromptPackageError("UNSUPPORTED_VERSION", "Unsupported package version.");
  const declared = new Set(["manifest.json", ...manifest.entries.map(({ path }) => path)]); if (names.some((name) => !declared.has(name))) throw new PromptPackageError("UNDECLARED_ENTRY", "Package contains an undeclared entry.");
  let totalBytes = 0;
  for (const entry of manifest.entries) { const bytes = files[entry.path]; if (!bytes) throw new PromptPackageError("ENTRY_MISSING", `Missing entry ${entry.path}.`); if (bytes.byteLength !== entry.bytes || await sha256(bytes) !== entry.sha256) throw new PromptPackageError("CHECKSUM_MISMATCH", `Checksum mismatch for ${entry.path}.`); }
  for (const [name, bytes] of Object.entries(files)) { totalBytes += bytes.byteLength; if (bytes.byteLength > PACKAGE_LIMITS.entryBytes) throw new PromptPackageError("ENTRY_TOO_LARGE", `${name} is too large.`); } if (totalBytes > PACKAGE_LIMITS.uncompressedBytes) throw new PromptPackageError("PACKAGE_TOO_LARGE", "Uncompressed package is too large.");
  const prompts = parseJson<PromptRecord[]>(files, "prompts.json");
  const assetMetadata = parseJson<AssetMetadata[]>(files, "assets.json", []);
  const promptIds = new Set(prompts.map(({ id }) => id));
  const assets = assetMetadata.map((metadata) => { if (!promptIds.has(metadata.promptId)) throw new PromptPackageError("ORPHAN_ASSET", "Asset references an unknown Prompt."); if (!/^image\/(png|jpeg|webp|gif)$|^video\/(mp4|webm)$/.test(metadata.mimeType)) throw new PromptPackageError("UNSUPPORTED_MEDIA", `Unsupported media type ${metadata.mimeType}.`); const bytes = files[metadata.path]; if (!bytes) throw new PromptPackageError("ENTRY_MISSING", `Missing entry ${metadata.path}.`); const { path: _path, ...record } = metadata; return { ...record, byteSize: bytes.byteLength, blob: new Blob([Uint8Array.from(bytes)], { type: metadata.mimeType }) }; });
  const versions = parseJson<PromptVersion[]>(files, "versions.json", []);
  const knowledge = parseJson<KnowledgeRecord[]>(files, "knowledge.json", []);
  const interfaceSettings = files["settings.json"] ? parseJson<InterfaceSettings>(files, "settings.json") : undefined;
  if (containsProviderConfiguration({ prompts, versions, knowledge, interfaceSettings })) throw new PromptPackageError("FORBIDDEN_PROVIDER_DATA", "Provider configuration is not portable.");
  if (manifest.promptCount !== prompts.length) throw new PromptPackageError("PROMPT_COUNT_MISMATCH", "Prompt count does not match manifest.");
  return { manifest, files, prompts, assets, versions, knowledge, interfaceSettings };
}
