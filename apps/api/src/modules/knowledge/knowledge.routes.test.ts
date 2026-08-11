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

  it("copies a built-in skill before editing it", async () => {
    const app = await buildApp({ prisma });
    const builtIn = await prisma.promptSkill.findFirstOrThrow({ where: { owner: "BUILT_IN" }, include: { modelTasks: true } });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/skills/${builtIn.id}`,
      payload: { contentZh: `${builtIn.contentZh}\n用户补充约束。` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ owner: "USER", version: 1 });
    expect(response.json().id).not.toBe(builtIn.id);
    expect((await prisma.promptSkill.findUniqueOrThrow({ where: { id: builtIn.id } })).contentZh).toBe(builtIn.contentZh);
    await prisma.promptSkill.delete({ where: { id: response.json().id } });
    await app.close();
  });

  it("creates and updates a personal rule", async () => {
    const app = await buildApp({ prisma });
    const task = await prisma.modelTask.findFirstOrThrow();
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/personal-rules",
      payload: { modelTaskId: task.id, nameZh: "默认构图", nameEn: "Default composition", contentZh: "保持构图", contentEn: "Preserve composition", priority: 900, enabled: true },
    });
    const id = created.json().id as string;
    try {
      const updated = await app.inject({ method: "PATCH", url: `/api/v1/personal-rules/${id}`, payload: { contentZh: "严格保持构图" } });
      const list = await app.inject({ method: "GET", url: "/api/v1/personal-rules?includeDisabled=true" });

      expect(created.statusCode).toBe(201);
      expect(updated.statusCode).toBe(200);
      expect(updated.json()).toMatchObject({ contentZh: "严格保持构图", version: 2, owner: "USER" });
      expect(list.json()).toEqual(expect.arrayContaining([expect.objectContaining({ id })]));
    } finally {
      await prisma.personalRule.delete({ where: { id } });
      await app.close();
    }
  });
});
