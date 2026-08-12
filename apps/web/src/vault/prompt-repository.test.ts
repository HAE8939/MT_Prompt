import { afterEach, describe, expect, it } from "vitest";
import type { PromptAsset, PromptRecord } from "../domain/types";
import { deleteVault } from "./open-vault";
import { createPromptRepository } from "./prompt-repository";

const now = "2026-08-12T00:00:00.000Z";

function makePrompt(id: string): PromptRecord {
  return { id, title: "餐椅", description: "黑胡桃", contentZh: "中文内容", contentEn: "English content", negativeZh: "", negativeEn: "", mediaType: "IMAGE", category: "家具", tags: ["实木"], favorite: false, rating: 0, origin: "MANUAL", createdAt: now, updatedAt: now };
}

function makeAsset(id: string, promptId: string): PromptAsset {
  return { id, promptId, role: "COVER", blob: new Blob(["image"]), mimeType: "image/png", originalName: "cover.png", byteSize: 5, checksum: "sum", createdAt: now };
}

afterEach(() => deleteVault());

describe("prompt repository", () => {
  it("creates and updates a Prompt with atomic versions and assets", async () => {
    const prompts = createPromptRepository();
    await prompts.create(makePrompt("p1"), [makeAsset("a1", "p1")]);
    await prompts.update("p1", { title: "新款餐椅" }, "修改标题");

    expect((await prompts.get("p1"))?.title).toBe("新款餐椅");
    expect(await prompts.listAssets("p1")).toHaveLength(1);
    expect(await prompts.listVersions("p1")).toHaveLength(2);
  });

  it("removes a Prompt with all related assets and versions", async () => {
    const prompts = createPromptRepository();
    await prompts.create(makePrompt("p1"), [makeAsset("a1", "p1")]);
    await prompts.remove("p1");

    expect(await prompts.get("p1")).toBeUndefined();
    expect(await prompts.listAssets("p1")).toEqual([]);
    expect(await prompts.listVersions("p1")).toEqual([]);
  });
});
