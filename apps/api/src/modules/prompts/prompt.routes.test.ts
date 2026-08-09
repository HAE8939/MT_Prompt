import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";

const prisma = new PrismaClient();

describe("Prompt routes", () => {
  beforeEach(async () => {
    await prisma.prompt.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a Prompt and filters it by keyword", async () => {
    const app = await buildApp({ prisma });
    const task = await prisma.modelTask.findFirstOrThrow();

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/prompts",
      payload: {
        title: "蓝调客厅",
        contentZh: "保持空间结构不变，把白天改成蓝调夜景。",
        modelTaskId: task.id,
        status: "VERIFIED",
      },
    });

    expect(created.statusCode).toBe(201);
    expect(created.json().title).toBe("蓝调客厅");

    const list = await app.inject({
      method: "GET",
      url: "/api/v1/prompts?keyword=蓝调&page=1&limit=20",
    });

    expect(list.statusCode).toBe(200);
    expect(list.json()).toMatchObject({ total: 1, data: [{ title: "蓝调客厅", status: "VERIFIED" }] });
    await app.close();
  });

  it("updates with a version snapshot and deletes the Prompt", async () => {
    const app = await buildApp({ prisma });
    const task = await prisma.modelTask.findFirstOrThrow();
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/prompts",
      payload: { title: "版本测试", contentZh: "第一版", modelTaskId: task.id },
    });
    const id = created.json().id as string;

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

    const deleted = await app.inject({ method: "DELETE", url: `/api/v1/prompts/${id}` });
    expect(deleted.statusCode).toBe(204);
    const detail = await app.inject({ method: "GET", url: `/api/v1/prompts/${id}` });
    expect(detail.statusCode).toBe(404);
    await app.close();
  });
});
