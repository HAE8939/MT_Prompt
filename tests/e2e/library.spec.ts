import { expect, test } from "@playwright/test";

test("keeps the library header actions aligned on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/library");

  const actions = page.locator(".library-header-actions");
  await expect(actions).toHaveCSS("display", "flex");

  const tops = await actions.locator("button").evaluateAll((buttons) =>
    buttons.map((button) => Math.round(button.getBoundingClientRect().top)),
  );
  expect(new Set(tops).size).toBe(1);
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 390);
});
