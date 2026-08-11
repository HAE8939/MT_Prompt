import { describe, expect, it, vi } from "vitest";
import { OpenAiCompatibleProvider } from "./openai-compatible-provider.js";

describe("OpenAiCompatibleProvider", () => {
  it("calls the OpenAI-compatible endpoint and parses structured content", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ contentZh: "优化后", contentEn: "Optimized", notes: ["保留主体"] }) } }] }), { status: 200 }));
    const provider = new OpenAiCompatibleProvider({ baseUrl: "https://lanfengai.cn", apiKey: "secret", model: "deepseek-v4-flash", fetcher });
    await expect(provider.assist({ operation: "OPTIMIZE", contentZh: "原始内容" })).resolves.toEqual({ contentZh: "优化后", contentEn: "Optimized", notes: ["保留主体"] });
    expect(fetcher).toHaveBeenCalledWith("https://lanfengai.cn/v1/chat/completions", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ Authorization: "Bearer secret" }) }));
  });

  it("maps authentication failures to stable errors", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 401 }));
    const provider = new OpenAiCompatibleProvider({ baseUrl: "https://example.com/v1", apiKey: "secret", model: "model", fetcher });
    await expect(provider.test()).rejects.toThrow("AI_INVALID_CREDENTIALS");
  });
});
