import type { PromptAsset, PromptRecord, PromptVersion } from "../domain/types";
import { VaultError } from "./errors";
import { requestResult, transactionDone } from "./idb-helpers";
import { openVault } from "./open-vault";
import type { PromptQuery, PromptRepository } from "./repository-types";

function versionOf(prompt: PromptRecord, version: number, changeNote: string): PromptVersion {
  return { id: crypto.randomUUID(), promptId: prompt.id, version, snapshot: prompt, changeNote, createdAt: new Date().toISOString() };
}

async function deleteByIndex(store: IDBObjectStore, indexName: string, value: IDBValidKey): Promise<void> {
  const keys = await requestResult<IDBValidKey[]>(store.index(indexName).getAllKeys(value));
  for (const key of keys) store.delete(key);
}

export function createPromptRepository(): PromptRepository {
  return {
    async list(query: PromptQuery) {
      const db = await openVault();
      const tx = db.transaction("prompts", "readonly");
      let records = await requestResult<PromptRecord[]>(tx.objectStore("prompts").getAll());
      await transactionDone(tx);
      const keyword = query.keyword?.trim().toLocaleLowerCase("zh-CN");
      records = records.filter((prompt) => {
        if (query.mediaType && prompt.mediaType !== query.mediaType) return false;
        if (query.favorite !== undefined && prompt.favorite !== query.favorite) return false;
        if (!keyword) return true;
        return [prompt.title, prompt.description, prompt.contentZh, prompt.contentEn, prompt.category, ...prompt.tags]
          .some((part) => part.toLocaleLowerCase("zh-CN").includes(keyword));
      });
      const direction = query.order === "asc" ? 1 : -1;
      return records.sort((left, right) => {
        const a = left[query.sort];
        const b = right[query.sort];
        const compared = typeof a === "string" ? a.localeCompare(String(b), "zh-CN") : Number(a) - Number(b);
        return compared === 0 ? left.id.localeCompare(right.id) : compared * direction;
      });
    },
    async get(id) {
      const db = await openVault();
      const tx = db.transaction("prompts", "readonly");
      const result = await requestResult<PromptRecord | undefined>(tx.objectStore("prompts").get(id));
      await transactionDone(tx);
      return result;
    },
    async create(prompt, assets) {
      if (assets.some((asset) => asset.promptId !== prompt.id)) throw new VaultError("REQUEST_FAILED", "Asset does not belong to the Prompt.");
      const db = await openVault();
      const tx = db.transaction(["prompts", "assets", "versions"], "readwrite");
      tx.objectStore("prompts").add(prompt);
      for (const asset of assets) tx.objectStore("assets").add(asset);
      tx.objectStore("versions").add(versionOf(prompt, 1, "创建提示词"));
      await transactionDone(tx);
      return prompt;
    },
    async update(id, patch, changeNote) {
      const db = await openVault();
      const tx = db.transaction(["prompts", "versions"], "readwrite");
      const done = transactionDone(tx);
      const store = tx.objectStore("prompts");
      const current = await requestResult<PromptRecord | undefined>(store.get(id));
      if (!current) { tx.abort(); await done.catch(() => undefined); throw new VaultError("REQUEST_FAILED", "Prompt not found."); }
      const versions = tx.objectStore("versions");
      const count = await requestResult(versions.index("promptId").count(id));
      const updated = { ...current, ...patch, id, updatedAt: new Date().toISOString() };
      store.put(updated);
      versions.add(versionOf(updated, count + 1, changeNote));
      await done;
      return updated;
    },
    async remove(id) {
      const db = await openVault();
      const tx = db.transaction(["prompts", "assets", "versions"], "readwrite");
      tx.objectStore("prompts").delete(id);
      await deleteByIndex(tx.objectStore("assets"), "promptId", id);
      await deleteByIndex(tx.objectStore("versions"), "promptId", id);
      await transactionDone(tx);
    },
    async listAssets(promptId) {
      const db = await openVault(); const tx = db.transaction("assets", "readonly");
      const result = await requestResult<PromptAsset[]>(tx.objectStore("assets").index("promptId").getAll(promptId));
      await transactionDone(tx); return result;
    },
    async addAsset(asset) {
      const db = await openVault(); const tx = db.transaction(["prompts", "assets"], "readwrite");
      const done = transactionDone(tx);
      const exists = await requestResult(tx.objectStore("prompts").count(asset.promptId));
      if (!exists) { tx.abort(); await done.catch(() => undefined); throw new VaultError("REQUEST_FAILED", "Prompt not found."); }
      tx.objectStore("assets").add(asset); await done;
    },
    async removeAsset(assetId) {
      const db = await openVault(); const tx = db.transaction("assets", "readwrite");
      tx.objectStore("assets").delete(assetId); await transactionDone(tx);
    },
    async listVersions(promptId) {
      const db = await openVault(); const tx = db.transaction("versions", "readonly");
      const result = await requestResult<PromptVersion[]>(tx.objectStore("versions").index("promptId").getAll(promptId));
      await transactionDone(tx); return result.sort((a, b) => a.version - b.version);
    },
    async restoreVersion(promptId, versionId) {
      const db = await openVault(); const tx = db.transaction(["prompts", "versions"], "readwrite");
      const done = transactionDone(tx);
      const versions = tx.objectStore("versions");
      const selected = await requestResult<PromptVersion | undefined>(versions.get(versionId));
      if (!selected || selected.promptId !== promptId) { tx.abort(); await done.catch(() => undefined); throw new VaultError("REQUEST_FAILED", "Prompt version not found."); }
      const count = await requestResult(versions.index("promptId").count(promptId));
      const restored = { ...selected.snapshot, id: promptId, updatedAt: new Date().toISOString() };
      tx.objectStore("prompts").put(restored);
      versions.add(versionOf(restored, count + 1, `恢复版本 ${selected.version}`));
      await done; return restored;
    },
  };
}
