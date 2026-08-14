import { expect, test } from "@playwright/test";

test("creates a Prompt through the UI and reopens its detail from the library", async ({ page }) => {
  const title = `E2E Prompt ${Date.now()}`;
  await page.goto("/library");
  await page.getByRole("button", { name: "新建 Prompt" }).click();
  await page.getByLabel("标题").fill(title);
  await page.getByLabel("中文 Prompt").fill("保持空间结构不变，镜头缓慢推进。");
  await page.getByRole("button", { name: "保存 Prompt" }).click();
  const detail = page.getByRole("complementary", { name: "Prompt 详情" });
  await expect(detail).toContainText(title);

  // Close the detail, search by title, and reopen it from the list.
  await page.getByLabel("关闭详情").click();
  await expect(detail).toBeHidden();
  await page.getByLabel("搜索 Prompt").fill(title);
  await page.locator(".local-prompt-card", { hasText: title }).click();
  await expect(detail).toBeVisible();
  await expect(detail).toContainText(title);
  await expect(detail).toContainText("保持空间结构不变，镜头缓慢推进。");
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
