import type { TranslationSettingsInput } from "@promptvault/contracts";
import { MicrosoftTranslationProvider } from "../compiler/microsoft-translation-provider.js";
import { OpenAITranslationProvider } from "../compiler/openai-translation-provider.js";
import { UnavailableTranslationProvider, type TranslationProvider } from "../compiler/translation-provider.js";
import type { CredentialStore } from "./credential-store.js";

const configKey = "translation/config";
const secretKey = (provider: string) => `translation/${provider}/api-key`;
type PublicConfig = Omit<TranslationSettingsInput, "apiKey">;

export class SettingsService {
  constructor(private readonly credentials: CredentialStore) {}

  async setTranslation(input: TranslationSettingsInput) {
    const { apiKey, ...config } = input;
    await this.credentials.set(secretKey(input.provider), apiKey);
    await this.credentials.set(configKey, JSON.stringify(config));
  }

  async getStatus() {
    const config = await this.getConfig();
    const configured = config ? Boolean(await this.credentials.get(secretKey(config.provider))) : false;
    return { translation: { provider: config?.provider ?? null, configured, model: config?.model ?? null, endpoint: config?.endpoint ?? null, region: config?.region ?? null } };
  }

  async getProvider(): Promise<TranslationProvider> {
    const config = await this.getConfig();
    if (!config) return new UnavailableTranslationProvider();
    const apiKey = await this.credentials.get(secretKey(config.provider));
    if (!apiKey) return new UnavailableTranslationProvider();
    return config.provider === "openai"
      ? new OpenAITranslationProvider({ apiKey, model: config.model })
      : new MicrosoftTranslationProvider({ apiKey, endpoint: config.endpoint, region: config.region });
  }

  private async getConfig(): Promise<PublicConfig | null> {
    const value = await this.credentials.get(configKey);
    if (!value) return null;
    try { return JSON.parse(value) as PublicConfig; }
    catch { return null; }
  }
}
