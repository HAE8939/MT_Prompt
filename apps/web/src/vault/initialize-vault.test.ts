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

  it("imports the minimal built-in generator knowledge once", async () => {
    await initializeVault();
    await initializeVault();

    const records = await readKnowledge();
    expect(records.filter(({ kind }) => kind === "TEMPLATE").length).toBeGreaterThanOrEqual(3);
    expect(records.filter(({ kind }) => kind === "SKILL").length).toBeGreaterThanOrEqual(4);
    expect(records.filter(({ kind }) => kind === "RULE").length).toBeGreaterThanOrEqual(2);
    expect(records.every(({ owner }) => owner === "BUILT_IN")).toBe(true);
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
