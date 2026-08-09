import cors from "@fastify/cors";
import Fastify from "fastify";

export async function buildApp() {
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: "http://127.0.0.1:5173",
  });

  app.get("/api/v1/health", async () => ({ status: "ok" as const }));

  return app;
}
