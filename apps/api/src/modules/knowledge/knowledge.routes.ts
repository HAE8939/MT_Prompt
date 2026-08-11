import { personalRuleInputSchema, personalRuleUpdateSchema, skillInputSchema, skillUpdateSchema, templateInputSchema, templateUpdateSchema } from "@promptvault/contracts";
import type { FastifyInstance } from "fastify";
import { KnowledgeService } from "./knowledge.service.js";

export async function registerKnowledgeRoutes(app: FastifyInstance, service: KnowledgeService) {
  app.get("/api/v1/models", async () => service.listModels());
  app.get<{ Params: { id: string } }>("/api/v1/models/:id/tasks", async (request) => service.listTasks(request.params.id));
  app.get("/api/v1/skills", async (request) => { const query = request.query as { modelTaskId?: string; includeDisabled?: string }; return { data: await service.listSkills(query.modelTaskId, query.includeDisabled === "true") }; });
  app.post("/api/v1/skills", async (request, reply) => reply.code(201).send(await service.createSkill(skillInputSchema.parse(request.body))));
  app.patch<{ Params: { id: string } }>("/api/v1/skills/:id", async (request) => service.updateSkill(request.params.id, skillUpdateSchema.parse(request.body)));
  app.delete<{ Params: { id: string } }>("/api/v1/skills/:id", async (request, reply) => { await service.deleteSkill(request.params.id); return reply.code(204).send(); });
  app.get("/api/v1/templates", async (request) => { const query = request.query as { modelTaskId?: string; includeDisabled?: string }; return { data: await service.listTemplates(query.modelTaskId, query.includeDisabled === "true") }; });
  app.post("/api/v1/templates", async (request, reply) => reply.code(201).send(await service.createTemplate(templateInputSchema.parse(request.body))));
  app.patch<{ Params: { id: string } }>("/api/v1/templates/:id", async (request) => service.updateTemplate(request.params.id, templateUpdateSchema.parse(request.body)));
  app.delete<{ Params: { id: string } }>("/api/v1/templates/:id", async (request, reply) => { await service.deleteTemplate(request.params.id); return reply.code(204).send(); });
  app.get("/api/v1/personal-rules", async (request) => { const query = request.query as { modelTaskId?: string; includeDisabled?: string }; return service.listPersonalRules(query.modelTaskId, query.includeDisabled === "true") });
  app.post("/api/v1/personal-rules", async (request, reply) => reply.code(201).send(await service.createPersonalRule(personalRuleInputSchema.parse(request.body))));
  app.patch<{ Params: { id: string } }>("/api/v1/personal-rules/:id", async (request) => service.updatePersonalRule(request.params.id, personalRuleUpdateSchema.parse(request.body)));
  app.delete<{ Params: { id: string } }>("/api/v1/personal-rules/:id", async (request, reply) => { await service.deletePersonalRule(request.params.id); return reply.code(204).send(); });
  app.get("/api/v1/categories", async () => service.listCategories());
  app.get("/api/v1/tags", async () => service.listTags());
}
