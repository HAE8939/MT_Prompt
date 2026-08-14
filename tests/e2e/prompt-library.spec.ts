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

test("keeps mobile Prompt detail above the bottom navigation", async ({ page }) => {
  const title = `E2E Mobile ${Date.now()}`;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/library");
  await page.getByRole("button", { name: "新建 Prompt" }).click();
  await page.getByLabel("标题").fill(title);
  await page.getByLabel("中文 Prompt").fill("保持空间结构不变，镜头缓慢推进。");
  await page.getByRole("button", { name: "保存 Prompt" }).click();
  const detail = page.getByRole("complementary", { name: "Prompt 详情" });
  await expect(detail).toContainText(title);

  const scroll = detail.locator(".detail-scroll");
  await scroll.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  const lastBlock = scroll.locator(":scope > *").last();
  const lastBox = await lastBlock.boundingBox();
  const nav = page.locator(".sidebar");
  const navBox = await nav.boundingBox();
  expect(lastBox!.y + lastBox!.height).toBeLessThanOrEqual(navBox!.y);
});
