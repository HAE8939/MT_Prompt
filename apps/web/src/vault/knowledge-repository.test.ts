import { afterEach, describe, expect, it } from "vitest";
import type { KnowledgeRecord } from "../domain/types";
import { createKnowledgeRepository } from "./knowledge-repository";
import { requestResult, transactionDone } from "./idb-helpers";
import { deleteVault, openVault } from "./open-vault";

const builtIn: KnowledgeRecord = { id: "builtin-k1", stableKey: "template.arch", kind: "TEMPLATE", owner: "BUILT_IN", nameZh: "建筑模板", nameEn: "Architecture", contentZh: "内置", contentEn: "Built in", enabled: true, version: 1, priority: 10, category: "建筑", updatedAt: "2026-08-12T00:00:00.000Z" };

afterEach(() => deleteVault());

describe("knowledge repository", () => {
  it("copies a built-in record when the user edits it", async () => {
    const db = await openVault();
    const tx = db.transaction("knowledge", "readwrite");
    tx.objectStore("knowledge").add(builtIn);
    await transactionDone(tx);

    const knowledge = createKnowledgeRepository();
    const saved = await knowledge.save({ ...builtIn, contentZh: "我的修改" });
    expect(saved.owner).toBe("USER");
    expect(saved.id).not.toBe(builtIn.id);
    expect((await knowledge.get(builtIn.id))?.contentZh).toBe("内置");
    expect(await requestResult((await openVault()).transaction("knowledge").objectStore("knowledge").count())).toBe(2);
  });
});
