import { createPromptSchema, promptListQuerySchema, updatePromptSchema } from "@promptvault/contracts";
import type { FastifyInstance } from "fastify";
import { PromptService } from "./prompt.service.js";

export async function registerPromptRoutes(app: FastifyInstance, service: PromptService) {
  app.get("/api/v1/prompts", async (request) => service.list(promptListQuerySchema.parse(request.query)));

  app.get<{ Params: { id: string } }>("/api/v1/prompts/:id", async (request, reply) => {
    try { return await service.get(request.params.id); }
    catch (error) { if (error instanceof Error && error.message === "PROMPT_NOT_FOUND") return reply.code(404).send({ error: { code: "PROMPT_NOT_FOUND", message: "Prompt 不存在。" } }); throw error; }
  });

  app.get<{ Params: { id: string } }>("/api/v1/prompts/:id/versions", async (request, reply) => {
    try { return await service.versions(request.params.id); }
    catch (error) { if (error instanceof Error && error.message === "PROMPT_NOT_FOUND") return reply.code(404).send({ error: { code: "PROMPT_NOT_FOUND", message: "Prompt 不存在。" } }); throw error; }
  });
  app.post<{ Params: { id: string; versionId: string } }>("/api/v1/prompts/:id/versions/:versionId/restore", async (request, reply) => {
    try { return await service.restoreVersion(request.params.id, request.params.versionId); }
    catch (error) { if (error instanceof Error && error.message === "PROMPT_VERSION_NOT_FOUND") return reply.code(404).send({ error: { code: error.message, message: "Prompt 版本不存在。" } }); throw error; }
  });

  app.post("/api/v1/prompts", async (request, reply) => {
    const prompt = await service.create(createPromptSchema.parse(request.body));
    return reply.code(201).send(prompt);
  });

  app.patch<{ Params: { id: string } }>("/api/v1/prompts/:id", async (request, reply) => {
    try { return await service.update(request.params.id, updatePromptSchema.parse(request.body)); }
    catch (error) { if (error instanceof Error && error.message === "PROMPT_NOT_FOUND") return reply.code(404).send({ error: { code: "PROMPT_NOT_FOUND", message: "Prompt 不存在。" } }); throw error; }
  });

  app.delete<{ Params: { id: string } }>("/api/v1/prompts/:id", async (request, reply) => {
    try { await service.remove(request.params.id); return reply.code(204).send(); }
    catch (error) { if (error instanceof Error && error.message.includes("Record to delete does not exist")) return reply.code(404).send({ error: { code: "PROMPT_NOT_FOUND", message: "Prompt 不存在。" } }); throw error; }
  });
}
