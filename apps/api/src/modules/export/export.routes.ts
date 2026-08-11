import type { FastifyInstance } from "fastify";
import { createReadStream } from "node:fs";
import type { ExportService } from "./export.service.js";

export async function registerExportRoutes(app: FastifyInstance, service: ExportService) {
  app.post("/api/v1/exports", async (_request, reply) => {
    const archive = await service.createExport();
    return reply.code(201).send({ filename: archive.filename, downloadUrl: `/api/v1/exports/${archive.filename}` });
  });
  app.get<{ Params: { filename: string } }>("/api/v1/exports/:filename", async (request, reply) => {
    try {
      const filename = request.params.filename;
      reply.header("Content-Type", "application/zip");
      reply.header("Content-Disposition", `attachment; filename="${filename}"`);
      return reply.send(createReadStream(service.resolve(filename)));
    } catch {
      return reply.code(404).send({ error: { code: "EXPORT_NOT_FOUND", message: "导出文件不存在。" } });
    }
  });
}
