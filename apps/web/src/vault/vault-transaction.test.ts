import { afterEach, describe, expect, it } from "vitest";
import type { PromptRecord } from "../domain/types";
import { requestResult, transactionDone } from "./idb-helpers";
import { deleteVault, openVault } from "./open-vault";
import { createVaultTransaction } from "./vault-transaction";

const prompt: PromptRecord = { id: "imported-p1", title: "导入提示词", description: "", contentZh: "中文", contentEn: "English", negativeZh: "", negativeEn: "", mediaType: "IMAGE", category: "测试", tags: [], favorite: false, rating: 0, origin: "IMPORTED", createdAt: "2026-08-12T00:00:00.000Z", updatedAt: "2026-08-12T00:00:00.000Z" };

afterEach(() => deleteVault());

describe("Vault transaction", () => {
  it("rolls back every store when an imported record conflicts", async () => {
    const db = await openVault();
    const seed = db.transaction("knowledge", "readwrite");
    seed.objectStore("knowledge").add({ id: "conflict", stableKey: "x", kind: "RULE", owner: "USER", nameZh: "x", nameEn: "x", contentZh: "x", contentEn: "x", enabled: true, version: 1, priority: 0, category: "x", updatedAt: prompt.updatedAt });
    await transactionDone(seed);

    await expect(createVaultTransaction().importBundle({ prompts: [prompt], assets: [], versions: [], knowledge: [{ id: "conflict", stableKey: "y", kind: "RULE", owner: "USER", nameZh: "y", nameEn: "y", contentZh: "y", contentEn: "y", enabled: true, version: 1, priority: 0, category: "y", updatedAt: prompt.updatedAt }], meta: [] })).rejects.toBeDefined();

    const check = db.transaction("prompts", "readonly");
    expect(await requestResult(check.objectStore("prompts").count())).toBe(0);
    await transactionDone(check);
  });
});
