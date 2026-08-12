import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";
import type { InterfaceSettings, PromptRecord } from "../domain/types";
import { exportPromptPackage } from "./export-prompt";
import { blobBytes } from "./hash";

const prompt: PromptRecord = {
  id: "p1", title: "测试", description: "", contentZh: "中文", contentEn: "English",
  negativeZh: "", negativeEn: "", mediaType: "IMAGE", category: "通用", tags: [],
  favorite: false, rating: 0, origin: "MANUAL",
  createdAt: "2026-08-12T00:00:00.000Z", updatedAt: "2026-08-12T00:00:00.000Z",
};
const interfaceSettings: InterfaceSettings = { theme: "light", language: "zh-CN", libraryView: "list", compact: true };

describe("exportPromptPackage", () => {
  it("creates a standard ZIP and never exports adjacent Provider settings", async () => {
    const fixtures = { prompts: [prompt], assets: [], provider: { baseUrl: "https://secret.example", model: "private-model", apiKey: "top-secret" } };
    const blob = await exportPromptPackage(fixtures, { includeSettings: true, interfaceSettings });
    const files = unzipSync(await blobBytes(blob));
    const text = Object.values(files).map((bytes) => strFromU8(bytes)).join("\n");

    expect(files["manifest.json"]).toBeDefined();
    expect(files["prompts.json"]).toBeDefined();
    expect(text).not.toContain("top-secret");
    expect(text).not.toContain("private-model");
    expect(text).not.toContain("secret.example");
  });
});
