import { expect, test } from "@playwright/test";

// NOTE: The asset upload itself (file chooser) crashes Chromium in this sandbox environment, so
// this E2E verifies the browser-local asset editing UI is wired into the editor without performing
// a real upload. Actual asset add/remove persistence is covered by the Vault unit tests.
test("exposes the local asset editor in the Prompt editor", async ({ page }) => {
  const title = `E2E Asset ${Date.now()}`;

  // Create a Prompt entirely through the browser Vault (no API server).
  await page.goto("/library");
  await page.getByRole("button", { name: "新建 Prompt" }).click();
  await page.getByLabel("标题").fill(title);
  await page.getByLabel("中文 Prompt").fill("蓝调夜景客厅。");
  await page.getByRole("button", { name: "保存 Prompt" }).click();

  const detail = page.getByRole("complementary", { name: "Prompt 详情" });
  await expect(detail).toContainText(title);

  // The browser-local asset flow is reachable from the editor.
  await detail.getByRole("button", { name: "编辑 Prompt" }).click();
  const editor = page.locator(".prompt-editor");
  await expect(editor).toBeVisible();
  const assetInput = editor.getByLabel("添加图片或视频素材");
  await expect(assetInput).toBeVisible();
  await expect(assetInput).toBeEnabled();

  // Cancel leaves the detail intact.
  await editor.getByRole("button", { name: "取消" }).click();
  await expect(detail).toBeVisible();
  await expect(detail).toContainText(title);
});
