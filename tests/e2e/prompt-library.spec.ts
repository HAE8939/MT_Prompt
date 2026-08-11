import { expect, test } from "@playwright/test";

test("creates a Prompt and reopens its detail", async ({ page, request }) => {
  const title = `E2E Prompt ${Date.now()}`;
  let promptId: string | undefined;
  try {
    await page.goto("/library");
    await page.getByRole("button", { name: "新建 Prompt" }).click();
    await page.getByLabel("标题").fill(title);
    await page.getByLabel("中文 Prompt").fill("保持空间结构不变。");
    await page.getByRole("button", { name: "保存 Prompt" }).click();
    await expect(page.getByRole("complementary", { name: "Prompt 详情" })).toContainText(title);

    const list = await request.get(`/api/v1/prompts?keyword=${encodeURIComponent(title)}&page=1&limit=10`);
    promptId = (await list.json()).data[0]?.id;
    expect(promptId).toBeTruthy();
  } finally {
    if (promptId) await request.delete(`/api/v1/prompts/${promptId}`);
  }
});
