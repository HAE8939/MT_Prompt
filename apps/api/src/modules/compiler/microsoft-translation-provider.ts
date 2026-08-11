import { TranslationError, type TranslationProvider } from "./translation-provider.js";

type Fetcher = typeof fetch;

export class MicrosoftTranslationProvider implements TranslationProvider {
  readonly id = "microsoft" as const;
  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly region?: string;
  private readonly fetcher: Fetcher;

  constructor(options: { apiKey: string; endpoint?: string; region?: string; fetcher?: Fetcher }) {
    this.apiKey = options.apiKey;
    this.endpoint = (options.endpoint ?? "https://api.cognitive.microsofttranslator.com").replace(/\/$/, "");
    this.region = options.region;
    this.fetcher = options.fetcher ?? fetch;
  }

  async translate(values: Record<string, string>): Promise<Record<string, string>> {
    const entries = Object.entries(values);
    if (!entries.length) return {};
    let response: Response;
    try {
      response = await this.fetcher(`${this.endpoint}/translate?api-version=3.0&from=zh-Hans&to=en`, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": this.apiKey,
          ...(this.region ? { "Ocp-Apim-Subscription-Region": this.region } : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(entries.map(([, value]) => ({ text: value }))),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new TranslationError("TIMEOUT");
      throw new TranslationError("UNAVAILABLE");
    }
    if (!response.ok) throw statusError(response.status);
    const body = await response.json() as Array<{ translations?: Array<{ text: string }> }>;
    if (body.length !== entries.length) throw new TranslationError("UNAVAILABLE");
    return Object.fromEntries(entries.map(([key], index) => [key, body[index]?.translations?.[0]?.text ?? ""]));
  }
}

function statusError(status: number) {
  if (status === 401 || status === 403) return new TranslationError("INVALID_CREDENTIALS");
  if (status === 408) return new TranslationError("TIMEOUT");
  if (status === 429) return new TranslationError("RATE_LIMITED");
  return new TranslationError("UNAVAILABLE");
}
