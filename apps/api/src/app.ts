import Fastify from "fastify";
import { registerProviderRoutes } from "./modules/provider/provider.routes.js";
import type { ResolveHostname } from "./modules/provider/provider-proxy.js";

export type AppOptions = { fetch?: typeof globalThis.fetch; resolveHostname?: ResolveHostname; /** Legacy test compatibility; these values are never used by the runtime. */ prisma?: unknown; translator?: unknown; credentialStore?: unknown };

export async function buildApp(options: AppOptions = {}) {
  const app = Fastify({ logger: false, bodyLimit: 256 * 1024 });
  app.get("/health", async () => ({ status: "ok" as const }));
  await registerProviderRoutes(app, { fetch: options.fetch ?? globalThis.fetch, resolveHostname: options.resolveHostname });
  return app;
}
