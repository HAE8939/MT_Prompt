import { zipSync, strToU8 } from "fflate";
import type { InterfaceSettings, KnowledgeRecord, PromptAsset, PromptRecord, PromptVersion } from "../domain/types";
import { blobBytes, sha256 } from "./hash";
import { PROMPT_PACKAGE_VERSION, portableSettingKeys, type PromptManifest } from "./package-format";
type ExportInput = { prompts: PromptRecord[]; assets: PromptAsset[]; versions?: PromptVersion[]; knowledge?: KnowledgeRecord[]; interfaceSettings?: InterfaceSettings };
type ExportOptions = { includeSettings?: boolean; includeKnowledge?: boolean; interfaceSettings?: InterfaceSettings; createdAt?: string };
const json = (value: unknown) => strToU8(JSON.stringify(value, null, 2));
function portablePrompt(prompt: PromptRecord) { return { id: prompt.id, title: prompt.title, description: prompt.description, contentZh: prompt.contentZh, contentEn: prompt.contentEn, negativeZh: prompt.negativeZh, negativeEn: prompt.negativeEn, mediaType: prompt.mediaType, category: prompt.category, tags: [...prompt.tags], favorite: prompt.favorite, rating: prompt.rating, origin: prompt.origin, provenance: prompt.provenance ? { compilerVersion: prompt.provenance.compilerVersion, template: prompt.provenance.template, skills: prompt.provenance.skills, createdAt: prompt.provenance.createdAt } : undefined, createdAt: prompt.createdAt, updatedAt: prompt.updatedAt }; }
function portableAsset(asset: PromptAsset) { return { id: asset.id, promptId: asset.promptId, role: asset.role, mimeType: asset.mimeType, originalName: asset.originalName, byteSize: asset.byteSize, checksum: asset.checksum, width: asset.width, height: asset.height, createdAt: asset.createdAt, path: `assets/${asset.id}` }; }
export async function exportPromptPackage(input: ExportInput, options: ExportOptions = {}): Promise<Blob> {
  const files: Record<string, Uint8Array> = { "prompts.json": json(input.prompts.map(portablePrompt)), "assets.json": json(input.assets.map(portableAsset)) };
  if (input.versions?.length) files["versions.json"] = json(input.versions);
  for (const asset of input.assets) files[`assets/${asset.id}`] = await blobBytes(asset.blob);
  if (options.includeKnowledge) files["knowledge.json"] = json(input.knowledge ?? []);
  const interfaceSettings = options.interfaceSettings ?? input.interfaceSettings;
  if (options.includeSettings && interfaceSettings) files["settings.json"] = json(Object.fromEntries(portableSettingKeys.map((key) => [key, interfaceSettings[key]])));
  const entries = await Promise.all(Object.entries(files).map(async ([path, bytes]) => ({ path, bytes: bytes.byteLength, sha256: await sha256(bytes) })));
  files["manifest.json"] = json({ format: "mt-prompt", version: PROMPT_PACKAGE_VERSION, createdAt: options.createdAt ?? new Date().toISOString(), promptCount: input.prompts.length, sections: { settings: Boolean(options.includeSettings && interfaceSettings), knowledge: Boolean(options.includeKnowledge) }, entries } satisfies PromptManifest);
  return new Blob([zipSync(files, { level: 6 })], { type: "application/zip" });
}
