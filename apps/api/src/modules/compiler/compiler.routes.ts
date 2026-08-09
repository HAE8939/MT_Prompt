import { compileRequestSchema } from "@promptvault/contracts";
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
}
