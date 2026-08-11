import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it, vi } from "vitest";
import { CompilerService } from "./compiler.service.js";
import type { TranslationProvider } from "./translation-provider.js";

const prisma = new PrismaClient();

describe("CompilerService", () => {
  afterAll(async () => prisma.$disconnect());

  it("persists Chinese and English output when translation succeeds", async () => {
    const task = await prisma.modelTask.findFirstOrThrow();
    const template = await prisma.promptTemplate.findFirstOrThrow({ where: { modelTaskId: task.id } });
    const translator: TranslationProvider = { id: "openai", translate: vi.fn().mockResolvedValue({ requirements: "Modify the daylight living room into a blue-hour scene." }) };
    const service = new CompilerService(prisma, translator);

    const run = await service.compile({ modelTaskId: task.id, templateId: template.id, skillIds: [], inputValues: { requirements: "将白天客厅改成蓝调夜景" } });

    expect(run.translationStatus).toBe("SUCCEEDED");
    expect(run.contentZh).toContain("将白天客厅改成蓝调夜景");
    expect(run.contentEn).toContain("Modify the daylight living room");
  });

  it("persists Chinese output when translation fails", async () => {
    const task = await prisma.modelTask.findFirstOrThrow();
    const template = await prisma.promptTemplate.findFirstOrThrow({ where: { modelTaskId: task.id } });
    const translator: TranslationProvider = { id: "microsoft", translate: vi.fn().mockRejectedValue(new Error("RATE_LIMITED")) };
    const service = new CompilerService(prisma, translator);

    const run = await service.compile({ modelTaskId: task.id, templateId: template.id, skillIds: [], inputValues: { requirements: "保持家具不变" } });

    expect(run.translationStatus).toBe("FAILED");
    expect(run.contentZh).toContain("保持家具不变");
    expect(run.contentEn).toBeNull();
    expect(run.translationError).toBe("RATE_LIMITED");
  });

  it("retries a failed translation on the existing compilation", async () => {
    const task = await prisma.modelTask.findFirstOrThrow();
    const template = await prisma.promptTemplate.findFirstOrThrow({ where: { modelTaskId: task.id } });
    const translate = vi.fn()
      .mockRejectedValueOnce(new Error("RATE_LIMITED"))
      .mockResolvedValueOnce({ content: "Keep the furniture unchanged." });
    const service = new CompilerService(prisma, { id: "openai", translate });
    const run = await service.compile({ modelTaskId: task.id, templateId: template.id, skillIds: [], inputValues: { requirements: "保持家具不变" } });

    const retried = await service.retryTranslation(run.id);

    expect(retried).toMatchObject({ id: run.id, contentEn: "Keep the furniture unchanged.", translationStatus: "SUCCEEDED", translationError: null });
  });

  it("saves a compilation as a generated Prompt with provenance", async () => {
    const task = await prisma.modelTask.findFirstOrThrow();
    const template = await prisma.promptTemplate.findFirstOrThrow({ where: { modelTaskId: task.id } });
    const translator: TranslationProvider = { id: "openai", translate: vi.fn().mockResolvedValue({ requirements: "A quiet blue-hour living room." }) };
    const service = new CompilerService(prisma, translator);
    const run = await service.compile({ modelTaskId: task.id, templateId: template.id, skillIds: [], inputValues: { requirements: "安静的蓝调客厅" } });

    const saved = await service.saveAsPrompt(run.id, { title: "编译保存测试" });
    try {
      expect(saved).toMatchObject({ title: "编译保存测试", origin: "GENERATED", compilationRunId: run.id });
      expect(await prisma.promptVersion.count({ where: { promptId: saved.id } })).toBe(1);
    } finally {
      await prisma.prompt.delete({ where: { id: saved.id } });
    }
  });
});
