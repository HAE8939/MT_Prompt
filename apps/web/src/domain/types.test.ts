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

  it("rejects provider keys nested in objects and arrays", () => {
    expect(
      isProviderFreePromptData({
        prompts: [{ metadata: { provider: { apiKey: "secret" } } }],
      }),
    ).toBe(false);
  });

  it("rejects mixed-case providerSettings keys", () => {
    expect(
      isProviderFreePromptData({
        settings: { PrOvIdErSeTtInGs: { apiKey: "secret" } },
      }),
    ).toBe(false);
  });

  it("allows unrelated model fields", () => {
    expect(
      isProviderFreePromptData({
        model: "gpt-image-1",
        modelProvider: "local",
        providerMetadata: { latency: 12 },
      }),
    ).toBe(true);
  });

  it("rejects cyclic data without throwing", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    expect(isProviderFreePromptData(cyclic)).toBe(false);
  });

  it("rejects data deeper than the 100-level traversal budget", () => {
    const root: Record<string, unknown> = {};
    let cursor = root;

    for (let depth = 0; depth <= 100; depth += 1) {
      const child: Record<string, unknown> = {};
      cursor.child = child;
      cursor = child;
    }

    expect(isProviderFreePromptData(root)).toBe(false);
  });

  it("rejects data exceeding the 10,000-value traversal budget", () => {
    expect(isProviderFreePromptData(new Array(10_001).fill(null))).toBe(false);
  });
});
