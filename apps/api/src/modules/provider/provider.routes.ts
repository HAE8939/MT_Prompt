import type { FastifyInstance } from "fastify";
import { assertSafeProviderUrl, providerEndpoint, ProviderProxyError, type ResolveHostname } from "./provider-proxy.js";
type Fetch = typeof globalThis.fetch;
type Body = { baseUrl: string; model: string; apiKey: string; messages: Array<{ role: "system" | "user" | "assistant"; content: string }> };
function valid(body: unknown): body is Body { const value = body as Partial<Body>; return Boolean(value && typeof value.baseUrl === "string" && typeof value.model === "string" && typeof value.apiKey === "string" && Array.isArray(value.messages) && value.messages.every((message) => ["system", "user", "assistant"].includes(message.role) && typeof message.content === "string")); }
export async function registerProviderRoutes(app: FastifyInstance, dependencies: { fetch: Fetch; resolveHostname?: ResolveHostname }) {
  app.post("/api/provider/chat/completions", async (request, reply) => {
    if (!valid(request.body)) return reply.code(400).send({ code: "INVALID_REQUEST" });
    try {
      const baseUrl = await assertSafeProviderUrl(request.body.baseUrl, dependencies.resolveHostname);
      const response = await dependencies.fetch(providerEndpoint(baseUrl), { method: "POST", redirect: "error", headers: { "content-type": "application/json", authorization: `Bearer ${request.body.apiKey}` }, body: JSON.stringify({ model: request.body.model, messages: request.body.messages }) });
      if (!response.ok) return reply.code(502).send({ code: "PROVIDER_UNAVAILABLE" });
      return reply.send(await response.json());
    } catch (error) {
      const code = error instanceof ProviderProxyError ? error.code : "PROVIDER_UNAVAILABLE";
      return reply.code(code === "PROVIDER_REJECTED" ? 400 : code === "PROVIDER_TIMEOUT" ? 504 : 502).send({ code });
    }
  });
}
