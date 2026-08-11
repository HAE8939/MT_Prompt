import { compilePrompt } from "@promptvault/compiler";
import type { PrismaClient } from "@prisma/client";
import type { CompileRequest, SaveCompilationInput } from "@promptvault/contracts";
import type { TranslationProvider } from "./translation-provider.js";

const sectionByCategory: Record<string, string> = {
  REFERENCE: "reference", LIGHTING: "style", CAMERA: "camera", PHOTOGRAPHY: "style",
  INTERIOR: "style", MATERIAL: "detail", CHARACTER: "detail", VIDEO: "camera",
};

function toStringArray(value: unknown, fallback: string[]) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : fallback;
}

export class CompilerService {
  constructor(private readonly prisma: PrismaClient, private readonly translator: TranslationProvider) {}

  async compile(request: CompileRequest) {
    const [modelTask, template, selectedSkills, personalRules] = await Promise.all([
      this.prisma.modelTask.findUniqueOrThrow({ where: { id: request.modelTaskId } }),
      this.prisma.promptTemplate.findFirstOrThrow({ where: { id: request.templateId, modelTaskId: request.modelTaskId, enabled: true } }),
      this.prisma.promptSkill.findMany({ where: { id: { in: request.skillIds }, enabled: true, modelTasks: { some: { modelTaskId: request.modelTaskId } } } }),
      this.prisma.personalRule.findMany({ where: { enabled: true, OR: [{ modelTaskId: null }, { modelTaskId: request.modelTaskId }] } }),
    ]);

    if (selectedSkills.length !== request.skillIds.length) throw new Error("INCOMPATIBLE_SKILL");

    let translatedValues: Record<string, string> | null = null;
    let translationError: string | null = null;
    try { translatedValues = await this.translator.translate(request.inputValues); }
    catch (error) { translationError = error instanceof Error ? error.message : "TRANSLATION_FAILED"; }

    const inputValues = Object.fromEntries(Object.entries(request.inputValues).map(([key, zh]) => [key, { zh, en: translatedValues?.[key] ?? "" }]));
    const compiled = compilePrompt({
      modelTaskKey: modelTask.stableKey,
      template: { key: template.stableKey, version: template.version, bodyZh: template.templateZh, bodyEn: template.templateEn },
      inputValues,
      skills: selectedSkills.map((skill) => ({ key: skill.stableKey, version: skill.version, section: sectionByCategory[skill.category] ?? "detail", priority: skill.priority, conflictGroup: skill.conflictGroup, contentZh: skill.contentZh, contentEn: skill.contentEn })),
      personalRules: personalRules.map((rule) => ({ key: rule.stableKey, version: rule.version, section: "constraints", priority: rule.priority, contentZh: rule.contentZh, contentEn: rule.contentEn })),
      sectionOrder: toStringArray(modelTask.sectionOrder, ["constraints", "reference", "modification", "style", "camera", "detail"]),
    });

    return this.prisma.compilationRun.create({
      data: {
        modelTaskId: modelTask.id, templateId: template.id, modelTaskKey: modelTask.stableKey, templateKey: template.stableKey, templateVersion: template.version,
        inputValues: request.inputValues, rulesSnapshot: { personalRules: personalRules.map((rule) => ({ key: rule.stableKey, version: rule.version })) },
        contentZh: compiled.contentZh, contentEn: translatedValues ? compiled.contentEn : null,
        translationStatus: translatedValues ? "SUCCEEDED" : "FAILED", translationProvider: this.translator.id, translationError,
        compilerVersion: "1", skills: { create: selectedSkills.map((skill) => ({ skillId: skill.id, stableKey: skill.stableKey, version: skill.version, contentZh: skill.contentZh, contentEn: skill.contentEn })) },
      },
      include: { skills: true },
    });
  }

  async saveAsPrompt(compilationRunId: string, input: SaveCompilationInput) {
    const run = await this.prisma.compilationRun.findUnique({
      where: { id: compilationRunId },
      include: { prompt: true },
    });
    if (!run) throw new Error("COMPILATION_NOT_FOUND");
    if (run.prompt) return run.prompt;

    return this.prisma.$transaction(async (tx) => {
      const prompt = await tx.prompt.create({
        data: {
          title: input.title,
          contentZh: run.contentZh,
          contentEn: run.contentEn,
          modelTaskId: run.modelTaskId,
          compilationRunId: run.id,
          origin: "GENERATED",
          status: "EXPERIMENT",
        },
      });
      await tx.promptVersion.create({
        data: {
          promptId: prompt.id,
          version: 1,
          snapshot: {
            title: prompt.title,
            contentZh: prompt.contentZh,
            contentEn: prompt.contentEn,
            modelTaskId: prompt.modelTaskId,
            origin: prompt.origin,
            compilationRunId: run.id,
          },
          changeNote: "由 Prompt 编译器生成",
        },
      });
      return prompt;
    });
  }
}
