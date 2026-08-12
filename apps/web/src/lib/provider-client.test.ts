import { describe, expect, it, vi } from "vitest";
import { complete } from "./provider-client";

describe("provider client", () => {
  it("sends credentials only with an explicit same-origin proxy request", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: "ok" } }] }) });
    vi.stubGlobal("fetch", fetch);
    await complete({ baseUrl: "https://provider.example/v1", model: "m", apiKey: "secret" }, [{ role: "user", content: "优化" }]);
    expect(fetch).toHaveBeenCalledWith("/api/provider/chat/completions", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toMatchObject({ baseUrl: "https://provider.example/v1", model: "m", apiKey: "secret" });
  });
});
