import cors from "@fastify/cors";
import type { PrismaClient } from "@prisma/client";
import Fastify from "fastify";
import { createPrismaClient } from "./plugins/prisma.js";
import { registerPromptRoutes } from "./modules/prompts/prompt.routes.js";
import { PromptService } from "./modules/prompts/prompt.service.js";
import { LocalStorageAdapter } from "./modules/assets/local-storage-adapter.js";
import { registerAssetRoutes } from "./modules/assets/asset.routes.js";
import { KnowledgeService } from "./modules/knowledge/knowledge.service.js";
import { registerKnowledgeRoutes } from "./modules/knowledge/knowledge.routes.js";
import { CompilerService } from "./modules/compiler/compiler.service.js";
import { registerCompilerRoutes } from "./modules/compiler/compiler.routes.js";
import { UnavailableTranslationProvider, type TranslationProvider } from "./modules/compiler/translation-provider.js";
import { join } from "node:path";

export type AppOptions = { prisma?: PrismaClient; translator?: TranslationProvider };

export async function buildApp(options: AppOptions = {}) {
  const app = Fastify({ logger: false });
  const prisma = options.prisma ?? createPrismaClient();
  const ownsPrisma = !options.prisma;

  await app.register(cors, {
    origin: "http://127.0.0.1:5173",
  });

  app.get("/api/v1/health", async () => ({ status: "ok" as const }));
  await registerPromptRoutes(app, new PromptService(prisma));
  const storageRoot = join(import.meta.dirname, "..", "..", "..", "storage");
  await registerAssetRoutes(app, prisma, new LocalStorageAdapter(storageRoot));
  await registerKnowledgeRoutes(app, new KnowledgeService(prisma));
  await registerCompilerRoutes(app, new CompilerService(prisma, options.translator ?? new UnavailableTranslationProvider()));

  if (ownsPrisma) {
    app.addHook("onClose", async () => prisma.$disconnect());
  }

  return app;
}
