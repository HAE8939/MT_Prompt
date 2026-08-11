import { aiAssistSchema } from "@promptvault/contracts";
import type { FastifyInstance } from "fastify";
import type { AiService } from "./ai.service.js";

export async function registerAiRoutes(app: FastifyInstance, service: AiService) {
  app.post("/api/v1/ai/assist", async (request) => service.assist(aiAssistSchema.parse(request.body)));
  app.post("/api/v1/ai/test", async (_request, reply) => { await service.test(); return reply.code(204).send(); });
}
