import { describe, expect, it } from "vitest";
import { CompilerConflictError, compilePrompt } from "./index.js";

const fixture = {
  modelTaskKey: "gpt-image-2-scene-preserving-edit",
  template: {
    key: "scene-default", version: 1,
    bodyZh: "{{requirements}}",
    bodyEn: "{{requirements}}",
  },
  inputValues: {
    requirements: { zh: "仅修改灯光，不改变空间结构。", en: "Modify lighting only; do not change the spatial structure." },
  },
  skills: [
    { key: "reference", version: 1, section: "reference", priority: 900, conflictGroup: "reference-control", contentZh: "使用提供的图片作为唯一参考。", contentEn: "Use the provided image as the sole reference." },
    { key: "cinematic", version: 1, section: "style", priority: 100, conflictGroup: null, contentZh: "采用电影感摄影语言。", contentEn: "Use cinematic photography language." },
  ],
  personalRules: [{ key: "preserve", version: 1, section: "constraints", priority: 1000, contentZh: "保持材质纹理。", contentEn: "Preserve material texture." }],
  sectionOrder: ["constraints", "reference", "modification", "style", "camera", "detail"],
} as const;

describe("compilePrompt", () => {
  it("fills bilingual content in stable priority order", () => {
    const result = compilePrompt(fixture);
    expect(result.contentZh).toBe("保持材质纹理。\n\n使用提供的图片作为唯一参考。\n\n仅修改灯光，不改变空间结构。\n\n采用电影感摄影语言。");
    expect(result.contentEn).toBe("Preserve material texture.\n\nUse the provided image as the sole reference.\n\nModify lighting only; do not change the spatial structure.\n\nUse cinematic photography language.");
    expect(result.metadata).toMatchObject({ modelTaskKey: fixture.modelTaskKey, skillKeys: ["reference", "cinematic"] });
  });

  it("rejects two enabled skills from one conflict group", () => {
    expect(() => compilePrompt({ ...fixture, skills: [...fixture.skills, { ...fixture.skills[0], key: "another-reference" }] })).toThrow(CompilerConflictError);
  });

  it("does not repeat identical sections", () => {
    const result = compilePrompt({ ...fixture, personalRules: [...fixture.personalRules, { ...fixture.personalRules[0], key: "duplicate" }] });
    expect(result.contentZh.match(/保持材质纹理。/g)).toHaveLength(1);
  });
});
