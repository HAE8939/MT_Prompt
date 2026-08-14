import { describe, expect, it } from "vitest";
import type { KnowledgeRecord } from "../../domain/types";
import { compileInBrowser } from "./browser-compiler";

const updatedAt = "2026-08-12T00:00:00.000Z";

function knowledge(
  kind: KnowledgeRecord["kind"],
  stableKey: string,
  contentZh: string,
  contentEn: string,
  category = "modification",
): KnowledgeRecord {
  return {
    id: stableKey,
    stableKey,
    kind,
    owner: "USER",
    nameZh: stableKey,
    nameEn: stableKey,
    contentZh,
    contentEn,
    enabled: true,
    version: 2,
    priority: 10,
    category,
    updatedAt,
  };
}

describe("compileInBrowser", () => {
  it("compiles a Chinese requirement into deterministic bilingual output", () => {
    const template = knowledge(
      "TEMPLATE",
      "template.interior",
      "设计要求：{{requirement}}",
      "Design requirement: {{requirement}}",
    );
    const skill = knowledge(
      "SKILL",
      "skill.material",
      "明确材质与工艺。",
      "Specify materials and craftsmanship.",
      "detail",
    );
    const rule = knowledge(
      "RULE",
      "rule.structure",
      "保持原有空间结构。",
      "Preserve the original spatial structure.",
      "constraints",
    );

    const result = compileInBrowser({
      requirementZh: "将毛坯房改造为现代客厅",
      requirementEn: "Transform the unfinished room into a modern living room",
      template,
      skills: [skill],
      rules: [rule],
      now: () => "2026-08-12T08:00:00.000Z",
    });

    expect(result.contentZh).toBe(
      "保持原有空间结构。\n\n设计要求：将毛坯房改造为现代客厅\n\n明确材质与工艺。",
    );
    expect(result.contentEn).toBe(
      "Preserve the original spatial structure.\n\nDesign requirement: Transform the unfinished room into a modern living room\n\nSpecify materials and craftsmanship.",
    );
    expect(result.provenance).toMatchObject({
      compilerVersion: "browser-v1",
      template: { stableKey: "template.interior" },
      skills: [{ stableKey: "skill.material" }],
      createdAt: "2026-08-12T08:00:00.000Z",
    });
  });

  it("does not include disabled knowledge and returns detached provenance", () => {
    const template = knowledge("TEMPLATE", "template.basic", "{{requirement}}", "{{requirement}}");
    const disabledSkill = { ...knowledge("SKILL", "skill.disabled", "不应出现", "Must not appear"), enabled: false };

    const result = compileInBrowser({
      requirementZh: "中文需求",
      requirementEn: "English requirement",
      template,
      skills: [disabledSkill],
      rules: [],
    });

    template.nameZh = "已修改";
    expect(result.contentZh).toBe("中文需求");
    expect(result.contentEn).toBe("English requirement");
    expect(result.provenance.template?.nameZh).toBe("template.basic");
    expect(result.provenance.skills).toEqual([]);
  });

  it("throws when Skills share a conflict group", () => {
    const template = knowledge("TEMPLATE", "template.interior", "设计要求：{{requirement}}", "Design requirement: {{requirement}}");
    const skillA = { ...knowledge("SKILL", "natural-light-preservation", "保持自然光方向。", "Preserve natural light direction.", "LIGHTING"), conflictGroup: "lighting" };
    const skillB = { ...knowledge("SKILL", "golden-hour-lighting", "转换为黄金时刻光线。", "Transform to golden-hour light.", "LIGHTING"), conflictGroup: "lighting" };

    expect(() => compileInBrowser({
      requirementZh: "将白天改成蓝调夜景",
      requirementEn: "Turn the daytime scene into blue-hour",
      template,
      skills: [skillA, skillB],
      rules: [],
    })).toThrow(/Conflicting skills in group lighting/);
  });

  it("compiles dynamic template fields in both languages", () => {
    const template = knowledge("TEMPLATE", "template.video", "任务要求：{{requirements}}\n镜头运动：{{cameraMotion}}", "Task requirements: {{requirements}}\nCamera motion: {{cameraMotion}}");
    template.fieldSchema = {
      fields: [
        { name: "requirements", labelZh: "任务要求", labelEn: "Task requirements", type: "textarea", required: true },
        { name: "cameraMotion", labelZh: "镜头运动", labelEn: "Camera motion", type: "textarea", required: true },
      ],
    };

    const result = compileInBrowser({
      requirementZh: "",
      template,
      skills: [],
      rules: [],
      fieldValues: {
        requirements: { zh: "把白天改成蓝调夜景", en: "Original Chinese requirement: 把白天改成蓝调夜景" },
        cameraMotion: { zh: "缓慢推进", en: "缓慢推进" },
      },
    });

    expect(result.contentZh).toBe("任务要求：把白天改成蓝调夜景\n镜头运动：缓慢推进");
    expect(result.contentEn).toBe("Task requirements: Original Chinese requirement: 把白天改成蓝调夜景\nCamera motion: 缓慢推进");
  });

  it("throws TEMPLATE_FIELD_REQUIRED when a required field is empty", () => {
    const template = knowledge("TEMPLATE", "template.video", "任务要求：{{requirements}}", "Task requirements: {{requirements}}");
    template.fieldSchema = {
      fields: [{ name: "requirements", labelZh: "任务要求", labelEn: "Task requirements", type: "textarea", required: true }],
    };

    expect(() => compileInBrowser({
      requirementZh: "",
      template,
      skills: [],
      rules: [],
      fieldValues: { requirements: { zh: "", en: "" } },
    })).toThrow("TEMPLATE_FIELD_REQUIRED");
  });
});
