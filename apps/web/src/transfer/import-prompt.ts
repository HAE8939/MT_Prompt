import type { InterfaceSettings, KnowledgeRecord, PromptAsset, PromptRecord, PromptVersion } from "../domain/types";
import type { KnowledgeRepository, PromptRepository, SettingsRepository, VaultTransaction } from "../vault/repository-types";
import { validatePromptPackage } from "./validate-prompt";

type Repositories = { prompts: PromptRepository; knowledge: KnowledgeRepository; settings: SettingsRepository; transaction: VaultTransaction };
export type PromptImportAction = { sourceId: string; targetId: string; action: "ADD" | "COPY" | "SKIP"; reason: "NEW" | "ID_CONTENT_CONFLICT" | "EXACT_DUPLICATE" };
export type PromptImportPreview = { token: string; promptActions: PromptImportAction[]; prompts: PromptRecord[]; assets: PromptAsset[]; versions: PromptVersion[]; knowledge: KnowledgeRecord[]; interfaceSettings?: InterfaceSettings; sections: { settings: boolean; knowledge: boolean } };

function comparable(prompt: PromptRecord) { const { updatedAt: _updatedAt, ...value } = prompt; return JSON.stringify(value); }
export async function previewPromptImport(blob: Blob, repositories: Repositories): Promise<PromptImportPreview> {
  const data = await validatePromptPackage(blob);
  const actions: PromptImportAction[] = [];
  for (const incoming of data.prompts) {
    const local = await repositories.prompts.get(incoming.id);
    if (!local) actions.push({ sourceId: incoming.id, targetId: incoming.id, action: "ADD", reason: "NEW" });
    else if (comparable(local) === comparable(incoming)) actions.push({ sourceId: incoming.id, targetId: incoming.id, action: "SKIP", reason: "EXACT_DUPLICATE" });
    else actions.push({ sourceId: incoming.id, targetId: crypto.randomUUID(), action: "COPY", reason: "ID_CONTENT_CONFLICT" });
  }
  return Object.freeze({ token: crypto.randomUUID(), promptActions: actions, prompts: data.prompts, assets: data.assets, versions: data.versions, knowledge: data.knowledge, interfaceSettings: data.interfaceSettings, sections: data.manifest.sections });
}

export async function applyPromptImport(preview: PromptImportPreview, selections: { includeSettings: boolean; includeKnowledge: boolean }, repositories: Repositories): Promise<void> {
  const idMap = new Map(preview.promptActions.filter(({ action }) => action !== "SKIP").map(({ sourceId, targetId }) => [sourceId, targetId]));
  const prompts = preview.prompts.filter(({ id }) => idMap.has(id)).map((record) => ({ ...record, id: idMap.get(record.id)!, origin: "IMPORTED" as const }));
  const assets = preview.assets.filter(({ promptId }) => idMap.has(promptId)).map((record) => ({ ...record, id: crypto.randomUUID(), promptId: idMap.get(record.promptId)! }));
  const versions = preview.versions.filter(({ promptId }) => idMap.has(promptId)).map((record) => ({ ...record, id: crypto.randomUUID(), promptId: idMap.get(record.promptId)!, snapshot: { ...record.snapshot, id: idMap.get(record.promptId)! } }));
  const localKnowledge = selections.includeKnowledge ? await repositories.knowledge.list() : [];
  const knowledgeKeys = new Set(localKnowledge.map(({ stableKey }) => stableKey));
  const knowledge = selections.includeKnowledge ? preview.knowledge.filter(({ stableKey }) => !knowledgeKeys.has(stableKey)).map((record) => ({ ...record, id: crypto.randomUUID(), owner: "USER" as const })) : [];
  await repositories.transaction.importBundle({ prompts, assets, versions, knowledge, interfaceSettings: selections.includeSettings ? preview.interfaceSettings : undefined, meta: [{ key: `import:${preview.token}`, value: { importedAt: new Date().toISOString(), promptCount: prompts.length } }] });
}
