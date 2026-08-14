import { describe, expect, it } from "vitest";
import { EXAMPLE_PROMPTS } from "./example-prompts";

describe("EXAMPLE_PROMPTS", () => {
  it("keeps the selected ten prompt bodies from the ciyuan01 source", () => {
    expect(EXAMPLE_PROMPTS).toHaveLength(10);
    expect(EXAMPLE_PROMPTS[0]?.contentZh).toContain("请基于上传的毛坯房照片生成一张现代温暖风客厅效果图");
    expect(EXAMPLE_PROMPTS[8]?.contentZh).toContain("深度拆解核心设计概念的国际化高精度排版矩阵");
    expect(EXAMPLE_PROMPTS[9]?.contentZh).toContain("深度透视工业制造美学的殿堂级解析图谱");
  });
});
