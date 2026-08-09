import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";

const prisma = new PrismaClient();

describe("Knowledge routes", () => {
  afterAll(async () => prisma.$disconnect());

  it("returns only skills compatible with a selected model task", async () => {
    const app = await buildApp({ prisma });
    const task = await prisma.modelTask.findFirstOrThrow({ where: { stableKey: "gpt-image-2-scene-preserving-edit" } });
    const response = await app.inject({ method: "GET", url: `/api/v1/skills?modelTaskId=${task.id}` });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.length).toBeGreaterThan(0);
    expect(response.json().data.every((skill: { modelTaskIds: string[] }) => skill.modelTaskIds.includes(task.id))).toBe(true);
    await app.close();
  });

  it("creates a user-owned skill without changing built-in skills", async () => {
    const app = await buildApp({ prisma });
    const task = await prisma.modelTask.findFirstOrThrow();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/skills",
      payload: {
        nameZh: "测试技能", nameEn: "Test Skill", contentZh: "测试内容", contentEn: "Test content",
        category: "TEST", priority: 100, conflictGroup: null, modelTaskIds: [task.id], enabled: true,
      },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().owner).toBe("USER");
    await prisma.promptSkill.delete({ where: { id: response.json().id } });
    await app.close();
  });
});
