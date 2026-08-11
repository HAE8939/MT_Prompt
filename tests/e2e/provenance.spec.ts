import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

const prisma = new PrismaClient();

test.afterAll(async () => prisma.$disconnect());

test("saves a generated Prompt and displays provenance", async ({ page, request }) => {
  const requirement = `E2E 蓝调客厅 ${Date.now()}`;
  let promptId: string | undefined;
  let compilationRunId: string | undefined;
  try {
    await page.goto("/generator");
    await page.getByLabel("任务要求").fill(requirement);
    await page.getByRole("button", { name: "生成 Prompt" }).click();
    await page.getByRole("button", { name: "保存到 Prompt 库" }).click();
    await expect(page.getByText("已保存到 Prompt 库")).toBeVisible();

    const list = await (await request.get(`/api/v1/prompts?keyword=${encodeURIComponent(requirement)}&page=1&limit=10`)).json();
    promptId = list.data[0]?.id;
    const detail = await (await request.get(`/api/v1/prompts/${promptId}`)).json();
    compilationRunId = detail.provenance.compilationRunId;
    await page.goto("/library");
    await page.getByLabel("搜索 Prompt").fill(requirement);
    await page.getByRole("button", { name: `打开${requirement}` }).click();
    await expect(page.getByText("生成来源")).toBeVisible();
  } finally {
    if (promptId) await request.delete(`/api/v1/prompts/${promptId}`);
    if (compilationRunId) await prisma.compilationRun.delete({ where: { id: compilationRunId } });
  }
});
