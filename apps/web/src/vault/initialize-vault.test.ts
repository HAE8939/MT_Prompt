import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KnowledgeRecord, PromptAsset, PromptRecord } from "../domain/types";
import { requestResult, transactionDone } from "./idb-helpers";
import { initializeVault } from "./initialize-vault";
import { deleteVault, openVault } from "./open-vault";
import { STORES, VAULT_NAME, VAULT_VERSION } from "./schema";

const APPROVED_TITLES = [
  "毛坯房转现代客厅效果图",
  "卫生间防水与石材湿区综合展板",
  "现代中餐厅动线与材质综合展板",
  "民宿外立面改造综合展板",
  "无主灯吊顶施工工艺综合展板",
  "屋顶花园空中露台综合展板",
  "五星级酒店大堂综合设计展板",
  "城市更新商业街区综合展板",
  "户外铝合金凉亭",
  "黑胡桃实木餐椅",
].sort();

async function readPrompts(): Promise<PromptRecord[]> {
  const db = await openVault();
  const transaction = db.transaction("prompts", "readonly");
  const prompts = await requestResult<PromptRecord[]>(
    transaction.objectStore("prompts").getAll(),
  );
  await transactionDone(transaction);
  return prompts;
}

async function readKnowledge(): Promise<KnowledgeRecord[]> {
  const db = await openVault();
  const transaction = db.transaction("knowledge", "readonly");
  const records = await requestResult<KnowledgeRecord[]>(
    transaction.objectStore("knowledge").getAll(),
  );
  await transactionDone(transaction);
  return records;
}

async function readAssets(): Promise<PromptAsset[]> {
  const db = await openVault();
  const transaction = db.transaction("assets", "readonly");
  const records = await requestResult<PromptAsset[]>(transaction.objectStore("assets").getAll());
  await transactionDone(transaction);
  return records;
}

afterEach(async () => {
  await deleteVault();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["seed-media"], { type: "image/webp" }), { status: 200 })));
});

describe("initializeVault", () => {
  it("creates the versioned Vault schema and required indexes", async () => {
    const db = await openVault();

    expect(db.name).toBe(VAULT_NAME);
    expect(db.version).toBe(VAULT_VERSION);
    expect([...db.objectStoreNames]).toEqual([...STORES].sort());

    const transaction = db.transaction([...STORES], "readonly");
    expect([...transaction.objectStore("prompts").indexNames]).toEqual([
      "favorite",
      "mediaType",
      "updatedAt",
    ]);
    expect([...transaction.objectStore("assets").indexNames]).toEqual([
      "promptId",
    ]);
    expect([...transaction.objectStore("versions").indexNames]).toEqual([
      "promptId",
    ]);
    expect([...transaction.objectStore("knowledge").indexNames]).toEqual([
      "kind",
      "stableKey",
    ]);
    expect(transaction.objectStore("knowledge").index("stableKey").unique).toBe(
      false,
    );
    expect(transaction.objectStore("settings").keyPath).toBe("key");
    expect(transaction.objectStore("meta").keyPath).toBe("key");
    await transactionDone(transaction);
  });

  it("imports exactly the ten approved examples once", async () => {
    await initializeVault();
    await initializeVault();

    const prompts = await readPrompts();
    expect(prompts).toHaveLength(10);
    expect(prompts.map(({ title }) => title).sort()).toEqual(APPROVED_TITLES);
    expect(prompts.map(({ id }) => id).sort()).toEqual(
      Array.from({ length: 10 }, (_, index) =>
        `builtin-prompt-${String(index + 1).padStart(2, "0")}`,
      ),
    );
    expect(prompts.every(({ contentZh, contentEn, origin }) =>
      contentZh.length > 0 && contentEn.length > 0 && origin === "BUILT_IN"
    )).toBe(true);
  });

  it("adds the approved cover and comparison media once", async () => {
    const loadAsset = async (path: string) => new Blob([path], { type: "image/webp" });
    await initializeVault({ loadAsset });
    await initializeVault({ loadAsset });

    const assets = await readAssets();
    expect(assets).toHaveLength(11);
    expect(assets.filter(({ role }) => role === "COVER")).toHaveLength(10);
    expect(assets).toContainEqual(expect.objectContaining({ promptId: "builtin-prompt-01", role: "REFERENCE", originalName: "01_before.webp", mimeType: "image/webp" }));
    expect(assets.every(({ byteSize }) => byteSize > 0)).toBe(true);
  });

  it("imports the complete built-in generator knowledge once", async () => {
    await initializeVault();
    await initializeVault();

    const records = await readKnowledge();
    expect(records.filter(({ kind }) => kind === "TEMPLATE")).toHaveLength(19);
    expect(records.filter(({ kind }) => kind === "SKILL")).toHaveLength(15);
    expect(records.filter(({ kind }) => kind === "RULE")).toHaveLength(2);
    expect(records.every(({ owner }) => owner === "BUILT_IN")).toBe(true);
  });

  it("adds newly shipped records when an older knowledge set is present", async () => {
    const db = await openVault();
    const transaction = db.transaction(["knowledge", "meta"], "readwrite");
    transaction.objectStore("knowledge").add({
      id: "builtin-skill-reference-lock",
      stableKey: "reference-lock",
      kind: "SKILL",
      owner: "BUILT_IN",
      nameZh: "旧参考图锁定",
      nameEn: "Old Reference Lock",
      contentZh: "旧内容",
      contentEn: "Old content",
      enabled: true,
      version: 1,
      priority: 0,
      category: "REFERENCE",
      updatedAt: "2026-08-01T00:00:00.000Z",
    } satisfies KnowledgeRecord);
    transaction.objectStore("meta").put({ key: "knowledgeSetVersion", value: 2 });
    await transactionDone(transaction);

    await initializeVault();

    const records = await readKnowledge();
    expect(records).toHaveLength(36);
    expect(records.find(({ stableKey }) => stableKey === "reference-lock")).toBeDefined();
    expect(records.find(({ stableKey }) => stableKey === "reference-lock")?.nameEn)
      .toBe("Reference Lock");
  });

  it("preserves a disabled built-in while refreshing its shipped definition", async () => {
    await initializeVault();
    const db = await openVault();
    const transaction = db.transaction(["knowledge", "meta"], "readwrite");
    const store = transaction.objectStore("knowledge");
    const skill = await requestResult<KnowledgeRecord>(store.index("stableKey").get("reference-lock"));
    store.put({ ...skill, enabled: false, contentEn: "Outdated shipped content" });
    transaction.objectStore("meta").put({ key: "knowledgeSetVersion", value: 2 });
    await transactionDone(transaction);

    await initializeVault();

    const upgraded = (await readKnowledge()).find(
      ({ stableKey }) => stableKey === "reference-lock",
    );
    expect(upgraded?.enabled).toBe(false);
    expect(upgraded?.contentEn).toContain("sole primary reference");
  });

  it("does not overwrite a user-owned record whose name conflicts with a built-in", async () => {
    const userRecord: KnowledgeRecord = {
      id: "user-reference-lock",
      stableKey: "user.reference-lock",
      kind: "SKILL",
      owner: "USER",
      nameZh: "参考图锁定",
      nameEn: "Reference Lock",
      contentZh: "我的内容",
      contentEn: "My content",
      enabled: false,
      version: 7,
      priority: 321,
      category: "CUSTOM",
      updatedAt: "2026-08-13T00:00:00.000Z",
    };
    const db = await openVault();
    const transaction = db.transaction(["knowledge", "meta"], "readwrite");
    transaction.objectStore("knowledge").add(userRecord);
    transaction.objectStore("meta").put({ key: "knowledgeSetVersion", value: 2 });
    await transactionDone(transaction);

    await initializeVault();

    expect((await readKnowledge()).find(({ id }) => id === userRecord.id)).toEqual(userRecord);
  });

  it("does not restore a deleted example after initialization is recorded", async () => {
    await initializeVault();
    const db = await openVault();
    const transaction = db.transaction("prompts", "readwrite");
    transaction.objectStore("prompts").delete("builtin-prompt-01");
    await transactionDone(transaction);

    await initializeVault();

    expect(await readPrompts()).toHaveLength(9);
  });

  it("does not overwrite an edited example after initialization is recorded", async () => {
    await initializeVault();
    const db = await openVault();
    const transaction = db.transaction("prompts", "readwrite");
    const store = transaction.objectStore("prompts");
    const prompt = await requestResult<PromptRecord>(
      store.get("builtin-prompt-01"),
    );
    store.put({ ...prompt, title: "我的客厅提示词" });
    await transactionDone(transaction);

    await initializeVault();

    const edited = (await readPrompts()).find(
      ({ id }) => id === "builtin-prompt-01",
    );
    expect(edited?.title).toBe("我的客厅提示词");
  });
});
