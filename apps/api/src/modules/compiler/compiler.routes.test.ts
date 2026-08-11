import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../app.js";
import type { TranslationProvider } from "./translation-provider.js";

const prisma = new PrismaClient();

describe("Compiler routes", () => {
  afterAll(async () => prisma.$disconnect());

  it("saves a compilation as a Prompt", async () => {
    const task = await prisma.modelTask.findFirstOrThrow();
    const template = await prisma.promptTemplate.findFirstOrThrow({ where: { modelTaskId: task.id } });
    const translator: TranslationProvider = {
      id: "openai",
      translate: vi.fn().mockResolvedValue({ requirements: "A quiet blue-hour living room." }),
    };
    const app = await buildApp({ prisma, translator });
    const compiled = await app.inject({
      method: "POST",
      url: "/api/v1/compiler/compile",
      payload: {
        modelTaskId: task.id,
        templateId: template.id,
        skillIds: [],
        inputValues: { requirements: "安静的蓝调客厅" },
      },
    });
    const compilationRunId = compiled.json().id as string;

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/compilations/${compilationRunId}/save-as-prompt`,
      payload: { title: "路由保存测试" },
    });

    try {
      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({ title: "路由保存测试", compilationRunId });
      const detail = await app.inject({ method: "GET", url: `/api/v1/prompts/${response.json().id}` });
      expect(detail.json()).toMatchObject({
        origin: "GENERATED",
        provenance: { templateKey: template.stableKey, templateVersion: template.version, translationProvider: "openai", compilerVersion: "1" },
      });
    } finally {
      const promptId = response.json().id as string | undefined;
      if (promptId) await prisma.prompt.delete({ where: { id: promptId } });
      await prisma.compilationRun.delete({ where: { id: compilationRunId } });
      await app.close();
    }
  });
});
