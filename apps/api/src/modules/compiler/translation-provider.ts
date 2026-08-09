export interface TranslationProvider {
  readonly id: "openai" | "microsoft";
  translate(values: Record<string, string>): Promise<Record<string, string>>;
}

export class TranslationUnavailableError extends Error {
  constructor() { super("NOT_CONFIGURED"); this.name = "TranslationUnavailableError"; }
}

export class UnavailableTranslationProvider implements TranslationProvider {
  readonly id = "openai" as const;
  async translate(): Promise<Record<string, string>> { throw new TranslationUnavailableError(); }
}
