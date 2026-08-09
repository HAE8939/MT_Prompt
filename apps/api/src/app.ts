import cors from "@fastify/cors";
import type { PrismaClient } from "@prisma/client";
import Fastify from "fastify";
import { createPrismaClient } from "./plugins/prisma.js";
import { registerPromptRoutes } from "./modules/prompts/prompt.routes.js";
import { PromptService } from "./modules/prompts/prompt.service.js";

export type AppOptions = { prisma?: PrismaClient };

export async function buildApp(options: AppOptions = {}) {
  const app = Fastify({ logger: false });
  const prisma = options.prisma ?? createPrismaClient();
  const ownsPrisma = !options.prisma;

  await app.register(cors, {
    origin: "http://127.0.0.1:5173",
  });

  app.get("/api/v1/health", async () => ({ status: "ok" as const }));
  await registerPromptRoutes(app, new PromptService(prisma));

  if (ownsPrisma) {
    app.addHook("onClose", async () => prisma.$disconnect());
  }

  return app;
}
