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
import type { TranslationProvider } from "./modules/compiler/translation-provider.js";
import { join } from "node:path";
import type { CredentialStore } from "./modules/settings/credential-store.js";
import { WindowsCredentialStore } from "./modules/settings/windows-credential-store.js";
import { SettingsService } from "./modules/settings/settings.service.js";
import { registerSettingsRoutes } from "./modules/settings/settings.routes.js";
import { ExportService } from "./modules/export/export.service.js";
import { registerExportRoutes } from "./modules/export/export.routes.js";
import { registerAiRoutes } from "./modules/ai/ai.routes.js";
import { AiService } from "./modules/ai/ai.service.js";
import { IntegrityService } from "./modules/export/integrity.service.js";
import { ImportService } from "./modules/export/import.service.js";

export type AppOptions = { prisma?: PrismaClient; translator?: TranslationProvider; credentialStore?: CredentialStore };

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
  const settings = new SettingsService(options.credentialStore ?? new WindowsCredentialStore());
  await registerSettingsRoutes(app, settings);
  const exportService = new ExportService(prisma, storageRoot, join(import.meta.dirname, "..", "..", "..", "exports"));
  await registerExportRoutes(app, exportService, new IntegrityService(prisma, storageRoot), new ImportService(prisma, storageRoot, exportService));
  await registerCompilerRoutes(app, new CompilerService(prisma, options.translator ?? (() => settings.getProvider())));
  await registerAiRoutes(app, new AiService(() => settings.getAiProvider()));

  if (ownsPrisma) {
    app.addHook("onClose", async () => prisma.$disconnect());
  }

  return app;
}
