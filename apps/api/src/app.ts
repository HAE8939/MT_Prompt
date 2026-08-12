import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { registerProviderRoutes } from "./modules/provider/provider.routes.js";
import type { ResolveHostname } from "./modules/provider/provider-proxy.js";

export type AppOptions = { fetch?: typeof globalThis.fetch; resolveHostname?: ResolveHostname; staticRoot?: string; /** Legacy test compatibility; these values are never used by the runtime. */ prisma?: unknown; translator?: unknown; credentialStore?: unknown };

export async function buildApp(options: AppOptions = {}) {
  const app = Fastify({ logger: false, bodyLimit: 256 * 1024 });
  app.get("/health", async () => ({ status: "ok" as const }));
  await registerProviderRoutes(app, { fetch: options.fetch ?? globalThis.fetch, resolveHostname: options.resolveHostname });
  const staticRoot = options.staticRoot ?? process.env.WEB_ROOT;
  if (staticRoot) {
    const root = resolve(staticRoot);
    await access(resolve(root, "index.html"));
    await app.register(fastifyStatic, { root, wildcard: false });
    app.get("/*", async (request, reply) => {
      if (request.url.startsWith("/api/")) return reply.code(404).send({ error: "Not Found", statusCode: 404 });
      return reply.sendFile("index.html");
    });
  }
  return app;
}
