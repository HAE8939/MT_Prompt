import { expect, test } from "@playwright/test";

test("uploads and removes a result image", async ({ page, request }) => {
  const models = await (await request.get("/api/v1/models")).json();
  const created = await request.post("/api/v1/prompts", { data: { title: `E2E Asset ${Date.now()}`, contentZh: "资产测试", modelTaskId: models[0].tasks[0].id } });
  const prompt = await created.json();
  let assetId: string | undefined;
  try {
    await page.goto("/library");
    await page.getByLabel("搜索 Prompt").fill(prompt.title);
    await page.getByRole("button", { name: `打开${prompt.title}` }).click();
    await page.getByLabel("选择图片").setInputFiles({ name: "e2e-result.png", mimeType: "image/png", buffer: tinyPng });
    await page.getByLabel("图片用途").selectOption("RESULT");
    await page.getByRole("button", { name: "上传素材" }).click();
    await expect(page.getByText("e2e-result.png")).toBeVisible();
    const detail = await (await request.get(`/api/v1/prompts/${prompt.id}`)).json();
    assetId = detail.assets.find((asset: { originalName: string }) => asset.originalName === "e2e-result.png")?.id;
    await page.getByRole("button", { name: "删除 e2e-result.png" }).click();
    await expect(page.getByText("e2e-result.png")).not.toBeVisible();
    assetId = undefined;
  } finally {
    if (assetId) await request.delete(`/api/v1/assets/${assetId}`);
    await request.delete(`/api/v1/prompts/${prompt.id}`);
  }
});

const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
