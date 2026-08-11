import { compileRequestSchema, saveCompilationSchema } from "@promptvault/contracts";
import type { FastifyInstance } from "fastify";
import { CompilerService } from "./compiler.service.js";

export async function registerCompilerRoutes(app: FastifyInstance, service: CompilerService) {
  app.post("/api/v1/compiler/compile", async (request, reply) => {
    try { return reply.code(201).send(await service.compile(compileRequestSchema.parse(request.body))); }
    catch (error) {
      if (error instanceof Error && error.message === "INCOMPATIBLE_SKILL") return reply.code(400).send({ error: { code: error.message, message: "所选 Skill 不适用于当前模型任务。" } });
      throw error;
    }
  });

  app.post("/api/v1/compilations/:id/save-as-prompt", async (request, reply) => {
    try {
      const params = request.params as { id: string };
      return reply.code(201).send(await service.saveAsPrompt(params.id, saveCompilationSchema.parse(request.body)));
    } catch (error) {
      if (error instanceof Error && error.message === "COMPILATION_NOT_FOUND") {
        return reply.code(404).send({ error: { code: error.message, message: "编译记录不存在。" } });
      }
      throw error;
    }
  });
}
