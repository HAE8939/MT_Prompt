import type { AiAssistInput } from "@promptvault/contracts";
import type { AiProvider } from "./ai-provider.js";

export class AiService {
  constructor(private readonly provider: AiProvider | (() => Promise<AiProvider>)) {}
  private async getProvider() { return typeof this.provider === "function" ? this.provider() : this.provider; }
  async assist(input: AiAssistInput) { return (await this.getProvider()).assist(input); }
  async test() { return (await this.getProvider()).test(); }
}
