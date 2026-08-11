import type { AiAssistRequest, AiAssistResult, AiProvider } from "./ai-provider.js";

type Fetcher = typeof fetch;

export class OpenAiCompatibleProvider implements AiProvider {
  readonly id = "openai-compatible";
  private readonly endpoint: string;
  constructor(private readonly options: { baseUrl: string; apiKey: string; model: string; fetcher?: Fetcher; timeoutMs?: number }) {
    this.endpoint = `${options.baseUrl.replace(/\/+$/, "")}${/\/v1$/i.test(options.baseUrl) ? "" : "/v1"}/chat/completions`;
  }

  async assist(request: AiAssistRequest): Promise<AiAssistResult> {
    const instruction = request.operation === "OPTIMIZE" ? "Improve the prompt while preserving its intent." : request.operation === "VARIANTS" ? "Return three concise prompt variants." : request.operation === "CONSISTENCY" ? "Check Chinese and English semantic consistency and propose corrections." : `Rewrite for the target model: ${request.targetModel ?? "the target model"}.`;
    const response = await this.call({
      messages: [
        { role: "system", content: `${instruction} Return JSON only with contentZh, contentEn (nullable), and notes (array). Never include markdown fences.` },
        { role: "user", content: JSON.stringify({ contentZh: request.contentZh, contentEn: request.contentEn ?? null, targetModel: request.targetModel ?? null }) },
      ],
    });
    const text = response.choices?.[0]?.message?.content;
    if (!text) throw new Error("AI_EMPTY_RESPONSE");
    try {
      const parsed = JSON.parse(text) as Partial<AiAssistResult>;
      if (typeof parsed.contentZh !== "string") throw new Error("AI_INVALID_RESPONSE");
      return { contentZh: parsed.contentZh, contentEn: typeof parsed.contentEn === "string" ? parsed.contentEn : null, notes: Array.isArray(parsed.notes) ? parsed.notes.filter((note): note is string => typeof note === "string") : [] };
    } catch { throw new Error("AI_INVALID_RESPONSE"); }
  }

  async test() { await this.call({ messages: [{ role: "user", content: "Reply with OK only." }], max_tokens: 8 }); }

  private async call(body: Record<string, unknown>) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 30_000);
    try {
      let response: Response;
      try {
        response = await (this.options.fetcher ?? fetch)(this.endpoint, { method: "POST", headers: { Authorization: `Bearer ${this.options.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: this.options.model, temperature: 0.2, ...body }), signal: controller.signal });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") throw new Error("AI_TIMEOUT");
        throw new Error("AI_UNAVAILABLE");
      }
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "AI_INVALID_CREDENTIALS" : response.status === 429 ? "AI_RATE_LIMITED" : "AI_UNAVAILABLE");
      return await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    } finally { clearTimeout(timer); }
  }
}
