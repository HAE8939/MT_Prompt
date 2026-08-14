import { expect, test } from "@playwright/test";

test("saves a generated Prompt and displays provenance", async ({ page }) => {
  const requirement = `E2E 蓝调客厅 ${Date.now()}`;
  await page.goto("/generator");
  await page.getByLabel("任务要求").fill(requirement);
  await page.getByRole("button", { name: "生成 Prompt" }).click();
  await page.getByRole("button", { name: "保存到 Prompt 库" }).click();
  await expect(page.getByText("已保存到 Prompt 库")).toBeVisible();

  // Reopen the saved Prompt from the browser-local library and confirm provenance renders.
  await page.goto("/library");
  await page.getByLabel("搜索 Prompt").fill(requirement);
  await page.locator(".local-prompt-card", { hasText: requirement }).click();
  const detail = page.getByRole("complementary", { name: "Prompt 详情" });
  await expect(detail).toBeVisible();
  await expect(detail.getByText("生成来源")).toBeVisible();
});
