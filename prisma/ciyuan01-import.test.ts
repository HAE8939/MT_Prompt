import { describe, expect, it } from "vitest";
import { parseCiyuanMarkdown } from "./import-ciyuan01.js";

describe("ciyuan01 import parser", () => {
  it("parses all 50 prompt entries and their cover image keys", async () => {
    const entries = await parseCiyuanMarkdown("ciyuan01/ciyuan01_gpt-image2_prompts.md");
    expect(entries).toHaveLength(50);
    expect(entries[0]).toMatchObject({ index: 1, title: "毛坯房转现代客厅效果图", coverFile: "01.webp", beforeFile: "01_before.webp" });
    expect(entries[49]).toMatchObject({ index: 50, coverFile: "50.webp" });
    expect(entries.every((entry) => entry.promptText.length > 20)).toBe(true);
  });
});
