import { strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import type { PromptAsset, PromptRecord } from "../domain/types";
import { exportPromptPackage } from "./export-prompt";
import { blobBytes } from "./hash";
import { validatePromptPackage } from "./validate-prompt";

describe("validatePromptPackage", () => {
  it("rejects parent traversal before semantic parsing", async () => {
    const blob = new Blob([zipSync({ "../escape.json": strToU8("{}") })]);
    await expect(validatePromptPackage(blob)).rejects.toMatchObject({ code: "UNSAFE_ENTRY_PATH" });
  });

  it("restores Prompt and associated media bytes", async () => {
    const prompt: PromptRecord = { id: "p1", title: "含图片", description: "", contentZh: "中文", contentEn: "English", negativeZh: "", negativeEn: "", mediaType: "IMAGE", category: "图像", tags: [], favorite: false, rating: 0, origin: "MANUAL", createdAt: "2026-08-12T00:00:00.000Z", updatedAt: "2026-08-12T00:00:00.000Z" };
    const asset: PromptAsset = { id: "a1", promptId: "p1", role: "COVER", blob: new Blob([strToU8("image-bytes")], { type: "image/png" }), mimeType: "image/png", originalName: "cover.png", byteSize: 11, checksum: "source-checksum", createdAt: prompt.createdAt };
    const validated = await validatePromptPackage(await exportPromptPackage({ prompts: [prompt], assets: [asset] }));

    expect(validated.prompts).toEqual([prompt]);
    expect(validated.assets[0]).toMatchObject({ id: "a1", promptId: "p1", mimeType: "image/png" });
    const restoredAsset = validated.assets[0];
    expect(restoredAsset).toBeDefined();
    expect(new TextDecoder().decode(await blobBytes(restoredAsset!.blob))).toBe("image-bytes");
  });

  it("rejects files not declared by the manifest", async () => {
    const prompt: PromptRecord = { id: "p1", title: "测试", description: "", contentZh: "中文", contentEn: "English", negativeZh: "", negativeEn: "", mediaType: "IMAGE", category: "图像", tags: [], favorite: false, rating: 0, origin: "MANUAL", createdAt: "2026-08-12T00:00:00.000Z", updatedAt: "2026-08-12T00:00:00.000Z" };
    const blob = await exportPromptPackage({ prompts: [prompt], assets: [] });
    const files = unzipSync(await blobBytes(blob));
    files["extra.json"] = strToU8("{}");
    await expect(validatePromptPackage(new Blob([zipSync(files)]))).rejects.toMatchObject({ code: "UNDECLARED_ENTRY" });
  });
});
