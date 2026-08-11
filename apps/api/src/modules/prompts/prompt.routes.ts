import { aiProposalSaveSchema, bulkPromptUpdateSchema, createPromptSchema, promptListQuerySchema, updatePromptSchema } from "@promptvault/contracts";
import type { FastifyInstance } from "fastify";
import { PromptService } from "./prompt.service.js";

export async function registerPromptRoutes(app: FastifyInstance, service: PromptService) {
  app.get("/api/v1/prompts", async (request) => service.list(promptListQuerySchema.parse(request.query)));
  app.get("/api/v1/prompts/duplicates", async () => service.duplicates());
  app.get("/api/v1/prompts/recycle-bin", async () => service.recycleBin());
  app.patch("/api/v1/prompts/bulk", async (request) => service.bulkUpdate(bulkPromptUpdateSchema.parse(request.body)));

  app.get<{ Params: { id: string } }>("/api/v1/prompts/:id", async (request, reply) => {
    try { return await service.get(request.params.id); }
    catch (error) { if (error instanceof Error && error.message === "PROMPT_NOT_FOUND") return reply.code(404).send({ error: { code: "PROMPT_NOT_FOUND", message: "Prompt 不存在。" } }); throw error; }
  });

  app.get<{ Params: { id: string } }>("/api/v1/prompts/:id/versions", async (request, reply) => {
    try { return await service.versions(request.params.id); }
    catch (error) { if (error instanceof Error && error.message === "PROMPT_NOT_FOUND") return reply.code(404).send({ error: { code: "PROMPT_NOT_FOUND", message: "Prompt 不存在。" } }); throw error; }
  });
  app.get<{ Params: { id: string }; Querystring: { from?: string; to?: string } }>("/api/v1/prompts/:id/versions/diff", async (request, reply) => {
    if (!request.query.from || !request.query.to) return reply.code(400).send({ error: { code: "VERSION_RANGE_REQUIRED", message: "请选择两个版本进行比较。" } });
    try { return await service.versionDiff(request.params.id, request.query.from, request.query.to); }
    catch (error) { if (error instanceof Error && error.message === "PROMPT_VERSION_NOT_FOUND") return reply.code(404).send({ error: { code: error.message, message: "Prompt 版本不存在。" } }); throw error; }
  });
  app.post<{ Params: { id: string; versionId: string } }>("/api/v1/prompts/:id/versions/:versionId/restore", async (request, reply) => {
    try { return await service.restoreVersion(request.params.id, request.params.versionId); }
    catch (error) { if (error instanceof Error && error.message === "PROMPT_VERSION_NOT_FOUND") return reply.code(404).send({ error: { code: error.message, message: "Prompt 版本不存在。" } }); throw error; }
  });
  app.post<{ Params: { id: string } }>("/api/v1/prompts/:id/restore", async (request, reply) => {
    try { return await service.restore(request.params.id); }
    catch (error) { if (error instanceof Error && error.message === "PROMPT_NOT_FOUND") return reply.code(404).send({ error: { code: error.message, message: "Prompt 不存在或未在回收站。" } }); throw error; }
  });

  app.post("/api/v1/prompts", async (request, reply) => {
    const prompt = await service.create(createPromptSchema.parse(request.body));
    return reply.code(201).send(prompt);
  });

  app.patch<{ Params: { id: string } }>("/api/v1/prompts/:id", async (request, reply) => {
    try { return await service.update(request.params.id, updatePromptSchema.parse(request.body)); }
    catch (error) { if (error instanceof Error && error.message === "PROMPT_NOT_FOUND") return reply.code(404).send({ error: { code: "PROMPT_NOT_FOUND", message: "Prompt 不存在。" } }); throw error; }
  });
  app.post<{ Params: { id: string } }>("/api/v1/prompts/:id/ai-proposals", async (request, reply) => {
    try { return await service.saveAiProposal(request.params.id, aiProposalSaveSchema.parse(request.body)); }
    catch (error) { if (error instanceof Error && error.message === "PROMPT_NOT_FOUND") return reply.code(404).send({ error: { code: error.message, message: "Prompt 不存在。" } }); throw error; }
  });

  app.delete<{ Params: { id: string } }>("/api/v1/prompts/:id", async (request, reply) => {
    try { await service.remove(request.params.id); return reply.code(204).send(); }
    catch (error) { if (error instanceof Error && error.message === "PROMPT_NOT_FOUND") return reply.code(404).send({ error: { code: "PROMPT_NOT_FOUND", message: "Prompt 不存在。" } }); throw error; }
  });
}
