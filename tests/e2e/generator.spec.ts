import { expect, test } from "@playwright/test";

test("generates Chinese output and exposes translation retry when unconfigured", async ({ page }) => {
  await page.goto("/generator");
  await page.getByLabel("任务要求").fill("把白天客厅改成蓝调夜景");
  await page.getByRole("button", { name: "生成 Prompt" }).click();
  await expect(page.getByText("中文 Prompt")).toBeVisible();
  await expect(page.getByRole("button", { name: "重试翻译" })).toBeVisible();
});
