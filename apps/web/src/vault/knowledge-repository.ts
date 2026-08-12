import type { KnowledgeRecord } from "../domain/types";
import { requestResult, transactionDone } from "./idb-helpers";
import { openVault } from "./open-vault";
import type { KnowledgeRepository } from "./repository-types";

export function createKnowledgeRepository(): KnowledgeRepository {
  return {
    async list(kind) {
      const db = await openVault(); const tx = db.transaction("knowledge", "readonly");
      const store = tx.objectStore("knowledge");
      const records = await requestResult<KnowledgeRecord[]>(kind ? store.index("kind").getAll(kind) : store.getAll());
      await transactionDone(tx); return records.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
    },
    async get(id) {
      const db = await openVault(); const tx = db.transaction("knowledge", "readonly");
      const record = await requestResult<KnowledgeRecord | undefined>(tx.objectStore("knowledge").get(id));
      await transactionDone(tx); return record;
    },
    async save(record) {
      const db = await openVault(); const tx = db.transaction("knowledge", "readwrite"); const store = tx.objectStore("knowledge");
      const existing = await requestResult<KnowledgeRecord | undefined>(store.get(record.id));
      const saved = existing?.owner === "BUILT_IN"
        ? { ...record, id: crypto.randomUUID(), stableKey: `${record.stableKey}.user.${crypto.randomUUID()}`, owner: "USER" as const, version: 1, updatedAt: new Date().toISOString() }
        : record;
      store.put(saved); await transactionDone(tx); return saved;
    },
    async remove(id) {
      const db = await openVault(); const tx = db.transaction("knowledge", "readwrite"); tx.objectStore("knowledge").delete(id); await transactionDone(tx);
    },
  };
}
