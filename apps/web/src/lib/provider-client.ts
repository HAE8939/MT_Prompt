import type { ProviderSettings } from "../domain/types";

export type ProviderMessage = { role: "system" | "user" | "assistant"; content: string };

export async function complete(settings: ProviderSettings, messages: ProviderMessage[], signal?: AbortSignal): Promise<string> {
  const response = await fetch("/api/provider/chat/completions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ baseUrl: settings.baseUrl, model: settings.model, apiKey: settings.apiKey, messages }), signal });
  if (!response.ok) throw new Error(response.status === 408 || response.status === 504 ? "Provider 请求超时" : "Provider 暂时不可用");
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

export async function testProvider(settings: ProviderSettings, signal?: AbortSignal): Promise<void> {
  await complete(settings, [{ role: "user", content: "Reply with OK." }], signal);
}
