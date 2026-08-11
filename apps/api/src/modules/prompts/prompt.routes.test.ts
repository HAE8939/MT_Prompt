import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";

const prisma = new PrismaClient();
let createdIds: string[] = [];

describe("Prompt routes", () => {
  afterEach(async () => {
    await prisma.prompt.deleteMany({ where: { id: { in: createdIds } } });
    createdIds = [];
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a Prompt and filters it by keyword", async () => {
    const app = await buildApp({ prisma });
    const task = await prisma.modelTask.findFirstOrThrow();
    const title = `蓝调客厅-${randomUUID()}`;

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/prompts",
      payload: {
        title,
        contentZh: "保持空间结构不变，把白天改成蓝调夜景。",
        modelTaskId: task.id,
        status: "VERIFIED",
      },
    });

    expect(created.statusCode).toBe(201);
    createdIds.push(created.json().id);
    expect(created.json().title).toBe(title);

    const list = await app.inject({
      method: "GET",
      url: `/api/v1/prompts?keyword=${encodeURIComponent(title)}&page=1&limit=20`,
    });

    expect(list.statusCode).toBe(200);
    expect(list.json()).toMatchObject({ total: 1, data: [{ title, status: "VERIFIED" }] });
    await app.close();
  });

  it("updates with a version snapshot and deletes the Prompt", async () => {
    const app = await buildApp({ prisma });
    const task = await prisma.modelTask.findFirstOrThrow();
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/prompts",
      payload: { title: `版本测试-${randomUUID()}`, contentZh: "第一版", modelTaskId: task.id },
    });
    const id = created.json().id as string;
    createdIds.push(id);

    const updated = await app.inject({
      method: "PATCH",
      url: `/api/v1/prompts/${id}`,
      payload: { contentZh: "第二版", changeNote: "补充约束" },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().contentZh).toBe("第二版");

    const versions = await app.inject({ method: "GET", url: `/api/v1/prompts/${id}/versions` });
    expect(versions.statusCode).toBe(200);
    expect(versions.json()).toHaveLength(2);

    const diff = await app.inject({ method: "GET", url: `/api/v1/prompts/${id}/versions/diff?from=${versions.json()[0].id}&to=${versions.json()[1].id}` });
    expect(diff.statusCode).toBe(200);
    expect(diff.json().some((item: { field: string; changed: boolean }) => item.field === "contentZh" && item.changed)).toBe(true);

    const deleted = await app.inject({ method: "DELETE", url: `/api/v1/prompts/${id}` });
    expect(deleted.statusCode).toBe(204);
    const detail = await app.inject({ method: "GET", url: `/api/v1/prompts/${id}` });
    expect(detail.statusCode).toBe(404);
    await app.close();
  });

  it("soft deletes a Prompt and restores it from the recycle bin", async () => {
    const app = await buildApp({ prisma });
    const task = await prisma.modelTask.findFirstOrThrow();
    const created = await app.inject({ method: "POST", url: "/api/v1/prompts", payload: { title: `回收站-${randomUUID()}`, contentZh: "可恢复", modelTaskId: task.id } });
    const id = created.json().id as string;
    createdIds.push(id);
    expect((await app.inject({ method: "DELETE", url: `/api/v1/prompts/${id}` })).statusCode).toBe(204);
    expect((await app.inject({ method: "GET", url: `/api/v1/prompts/${id}` })).statusCode).toBe(404);
    expect((await app.inject({ method: "POST", url: `/api/v1/prompts/${id}/restore` })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: `/api/v1/prompts/${id}` })).statusCode).toBe(200);
    await app.close();
  });

  it("updates an exact batch and reports normalized duplicates", async () => {
    const app = await buildApp({ prisma });
    const task = await prisma.modelTask.findFirstOrThrow();
    const first = await app.inject({ method: "POST", url: "/api/v1/prompts", payload: { title: `批量一-${randomUUID()}`, contentZh: "同一 内容", modelTaskId: task.id } });
    const second = await app.inject({ method: "POST", url: "/api/v1/prompts", payload: { title: `批量二-${randomUUID()}`, contentZh: " 同一   内容 ", modelTaskId: task.id } });
    const ids = [first.json().id, second.json().id] as string[];
    createdIds.push(...ids);
    const updated = await app.inject({ method: "PATCH", url: "/api/v1/prompts/bulk", payload: { ids, status: "FAVORITE" } });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ updated: 2 });
    const duplicates = await app.inject({ method: "GET", url: "/api/v1/prompts/duplicates" });
    expect(duplicates.statusCode).toBe(200);
    expect(duplicates.json().some((group: { ids: string[] }) => ids.every((id) => group.ids.includes(id)))).toBe(true);
    await app.close();
  });

  it("saves an accepted AI proposal as a new version", async () => {
    const app = await buildApp({ prisma });
    const task = await prisma.modelTask.findFirstOrThrow();
    const created = await app.inject({ method: "POST", url: "/api/v1/prompts", payload: { title: `AI建议-${randomUUID()}`, contentZh: "原始", modelTaskId: task.id } });
    const id = created.json().id as string;
    createdIds.push(id);
    const saved = await app.inject({ method: "POST", url: `/api/v1/prompts/${id}/ai-proposals`, payload: { contentZh: "采纳后的建议", contentEn: "Accepted proposal" } });
    expect(saved.statusCode).toBe(200);
    expect(saved.json().contentZh).toBe("采纳后的建议");
    expect((await app.inject({ method: "GET", url: `/api/v1/prompts/${id}/versions` })).json()).toHaveLength(2);
    await app.close();
  });
});
