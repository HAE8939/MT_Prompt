import { describe, expect, it, vi } from "vitest";
import { MicrosoftTranslationProvider } from "./microsoft-translation-provider.js";
import { OpenAITranslationProvider } from "./openai-translation-provider.js";

describe("translation providers", () => {
  it("requests structured translations from the OpenAI Responses API", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output_text: '{"requirements":"Blue-hour living room"}' }), { status: 200 }));
    const provider = new OpenAITranslationProvider({ apiKey: "secret", model: "gpt-5-mini", fetcher });

    await expect(provider.translate({ requirements: "蓝调客厅" })).resolves.toEqual({ requirements: "Blue-hour living room" });
    expect(fetcher).toHaveBeenCalledWith("https://api.openai.com/v1/responses", expect.objectContaining({ method: "POST" }));
  });

  it("maps Microsoft Translator results back to the original keys", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { translations: [{ text: "Blue-hour living room", to: "en" }] },
      { translations: [{ text: "Keep the furniture", to: "en" }] },
    ]), { status: 200 }));
    const provider = new MicrosoftTranslationProvider({ apiKey: "secret", region: "eastasia", fetcher });

    await expect(provider.translate({ requirements: "蓝调客厅", constraints: "保持家具" })).resolves.toEqual({ requirements: "Blue-hour living room", constraints: "Keep the furniture" });
  });
});
