export interface TranslationProvider {
  readonly id: "openai" | "microsoft";
  translate(values: Record<string, string>): Promise<Record<string, string>>;
}

export type TranslationErrorCode = "NOT_CONFIGURED" | "INVALID_CREDENTIALS" | "RATE_LIMITED" | "TIMEOUT" | "UNAVAILABLE";

export class TranslationError extends Error {
  constructor(public readonly code: TranslationErrorCode) {
    super(code);
    this.name = "TranslationError";
  }
}

export class TranslationUnavailableError extends TranslationError {
  constructor() { super("NOT_CONFIGURED"); this.name = "TranslationUnavailableError"; }
}

export class UnavailableTranslationProvider implements TranslationProvider {
  readonly id = "openai" as const;
  async translate(): Promise<Record<string, string>> { throw new TranslationUnavailableError(); }
}
