import { expect, test } from "@playwright/test";

test("cascades model selection into the task and template lists", async ({ page }) => {
  await page.goto("/generator");
  const modelSelect = page.getByLabel("模型", { exact: true });
  await expect(modelSelect).toHaveValue("gpt-image-2");

  await modelSelect.selectOption("kling-3");
  const taskSelect = page.getByLabel("任务", { exact: true });
  const templateSelect = page.getByLabel("模板", { exact: true });
  // Native <option> elements are not layout-visible until the select opens, so assert on the
  // select's text content (which lists every option label) instead of option visibility.
  await expect(taskSelect).toContainText("图片转视频");
  await expect(templateSelect).toContainText("图片转视频基础模板");

  // Switching back restores the original task/template set.
  await modelSelect.selectOption("gpt-image-2");
  await expect(taskSelect).toContainText("图片生成");
});

test("generates bilingual output locally and saves to the library without a Provider", async ({ page }) => {
  await page.goto("/generator");
  await page.getByLabel("任务要求").fill("把白天客厅改成蓝调夜景");
  await page.getByRole("button", { name: "生成 Prompt" }).click();

  await expect(page.getByText("中文 Prompt")).toBeVisible();
  await expect(page.getByText("English Prompt")).toBeVisible();

  const zhResult = page.locator("section.prompt-block").first().locator("pre");
  await expect(zhResult).toContainText("把白天客厅改成蓝调夜景");
  const enResult = page.locator("section.prompt-block").nth(1).locator("pre");
  await expect(enResult).toContainText("Original Chinese requirement: 把白天客厅改成蓝调夜景");

  // Copy controls exist for both languages.
  await expect(page.getByRole("button", { name: "复制" })).toHaveCount(2);
  // Provider is not configured in a clean context, so enhancement stays hidden.
  await expect(page.getByRole("button", { name: "增强 Prompt" })).toHaveCount(0);

  await page.getByRole("button", { name: "保存到 Prompt 库" }).click();
  await expect(page.getByText("已保存到 Prompt 库")).toBeVisible();
});

test("invalidates generated output when an input changes", async ({ page }) => {
  await page.goto("/generator");
  const requirements = page.getByLabel("任务要求");
  await requirements.fill("生成时的旧需求");
  await page.getByRole("button", { name: "生成 Prompt" }).click();
  await expect(page.locator("section.prompt-block").first()).toContainText("生成时的旧需求");
  await expect(page.getByRole("button", { name: "保存到 Prompt 库" })).toBeVisible();

  await requirements.fill("修改后的新需求");

  await expect(page.getByRole("heading", { name: "等待生成" })).toBeVisible();
  await expect(page.getByRole("button", { name: "保存到 Prompt 库" })).toHaveCount(0);
});

test("saves Kling output as a video Prompt", async ({ page }) => {
  const requirement = `E2E 视频分类 ${Date.now()}`;
  await page.goto("/generator");
  await page.getByLabel("模型", { exact: true }).selectOption("kling-3");
  await page.getByLabel("任务要求").fill(requirement);
  await page.getByRole("button", { name: "生成 Prompt" }).click();
  await page.getByRole("button", { name: "保存到 Prompt 库" }).click();
  await expect(page.getByText("已保存到 Prompt 库")).toBeVisible();

  await page.goto("/library");
  await page.getByLabel("搜索 Prompt").fill(requirement);
  await page.getByRole("button", { name: "视频", exact: true }).click();
  await expect(page.locator(".local-prompt-card", { hasText: requirement })).toBeVisible();

  await page.getByRole("button", { name: "图片", exact: true }).click();
  await expect(page.locator(".local-prompt-card", { hasText: requirement })).toHaveCount(0);
});
