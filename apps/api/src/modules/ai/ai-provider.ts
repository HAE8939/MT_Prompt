export type AiOperation = "OPTIMIZE" | "VARIANTS" | "CONSISTENCY" | "REWRITE";

export type AiAssistRequest = {
  operation: AiOperation;
  contentZh: string;
  contentEn?: string;
  targetModel?: string;
};

export type AiAssistResult = {
  contentZh: string;
  contentEn: string | null;
  notes: string[];
};

export interface AiProvider {
  readonly id: string;
  assist(request: AiAssistRequest): Promise<AiAssistResult>;
  test(): Promise<void>;
}

export class UnavailableAiProvider implements AiProvider {
  readonly id = "unavailable";
  async assist(): Promise<AiAssistResult> { throw new Error("AI_PROVIDER_NOT_CONFIGURED"); }
  async test(): Promise<void> { throw new Error("AI_PROVIDER_NOT_CONFIGURED"); }
}
