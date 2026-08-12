import { describe, expect, it } from "vitest";

import { isProviderFreePromptData } from "./types";

describe("isProviderFreePromptData", () => {
  it("rejects provider settings while accepting provider-free prompt data", () => {
    expect(
      isProviderFreePromptData({
        title: "餐椅",
        contentZh: "黑胡桃",
        provider: { apiKey: "secret" },
      }),
    ).toBe(false);

    expect(
      isProviderFreePromptData({
        title: "餐椅",
        contentZh: "黑胡桃",
      }),
    ).toBe(true);
  });
});
