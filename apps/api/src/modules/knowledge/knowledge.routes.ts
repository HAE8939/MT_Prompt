import { skillInputSchema, templateInputSchema } from "@promptvault/contracts";
import type { FastifyInstance } from "fastify";
import { KnowledgeService } from "./knowledge.service.js";

export async function registerKnowledgeRoutes(app: FastifyInstance, service: KnowledgeService) {
  app.get("/api/v1/models", async () => service.listModels());
  app.get<{ Params: { id: string } }>("/api/v1/models/:id/tasks", async (request) => service.listTasks(request.params.id));
  app.get("/api/v1/skills", async (request) => ({ data: await service.listSkills((request.query as { modelTaskId?: string }).modelTaskId) }));
  app.post("/api/v1/skills", async (request, reply) => reply.code(201).send(await service.createSkill(skillInputSchema.parse(request.body))));
  app.get("/api/v1/templates", async (request) => ({ data: await service.listTemplates((request.query as { modelTaskId?: string }).modelTaskId) }));
  app.post("/api/v1/templates", async (request, reply) => reply.code(201).send(await service.createTemplate(templateInputSchema.parse(request.body))));
  app.get("/api/v1/personal-rules", async (request) => service.listPersonalRules((request.query as { modelTaskId?: string }).modelTaskId));
  app.get("/api/v1/categories", async () => service.listCategories());
  app.get("/api/v1/tags", async () => service.listTags());
}
