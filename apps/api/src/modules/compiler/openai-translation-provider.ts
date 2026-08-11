import { TranslationError, type TranslationProvider } from "./translation-provider.js";

type Fetcher = typeof fetch;

export class OpenAITranslationProvider implements TranslationProvider {
  readonly id = "openai" as const;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetcher: Fetcher;

  constructor(options: { apiKey: string; model?: string; fetcher?: Fetcher }) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? "gpt-5-mini";
    this.fetcher = options.fetcher ?? fetch;
  }

  async translate(values: Record<string, string>): Promise<Record<string, string>> {
    const keys = Object.keys(values);
    if (!keys.length) return {};
    let response: Response;
    try {
      response = await this.fetcher("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          instructions: "Translate each Chinese value into concise, natural English for an image or video generation prompt. Preserve the JSON keys exactly and return JSON only.",
          input: JSON.stringify(values),
          text: {
            format: {
              type: "json_schema",
              name: "prompt_translations",
              strict: true,
              schema: {
                type: "object",
                properties: Object.fromEntries(keys.map((key) => [key, { type: "string" }])),
                required: keys,
                additionalProperties: false,
              },
            },
          },
        }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new TranslationError("TIMEOUT");
      throw new TranslationError("UNAVAILABLE");
    }
    if (!response.ok) throw statusError(response.status);
    const body = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const text = body.output_text ?? body.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (!text) throw new TranslationError("UNAVAILABLE");
    try { return JSON.parse(text) as Record<string, string>; }
    catch { throw new TranslationError("UNAVAILABLE"); }
  }
}

function statusError(status: number) {
  if (status === 401 || status === 403) return new TranslationError("INVALID_CREDENTIALS");
  if (status === 408) return new TranslationError("TIMEOUT");
  if (status === 429) return new TranslationError("RATE_LIMITED");
  return new TranslationError("UNAVAILABLE");
}
