import type { FastifyInstance } from "fastify";
import { createReadStream } from "node:fs";
import type { ExportService } from "./export.service.js";
import type { IntegrityService } from "./integrity.service.js";
import type { ImportService } from "./import.service.js";

export async function registerExportRoutes(app: FastifyInstance, service: ExportService, integrity?: IntegrityService, importer?: ImportService) {
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
  if (integrity) app.get("/api/v1/integrity", async () => integrity.scan());
  if (importer) app.post("/api/v1/imports/validate", async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: { code: "FILE_REQUIRED", message: "请选择 PromptVault ZIP 备份。" } });
    try { return await importer.preview(await file.toBuffer()); }
    catch (error) { return reply.code(400).send({ error: { code: error instanceof Error ? error.message : "IMPORT_INVALID", message: "备份文件校验失败。" } }); }
  });
  if (importer) app.post<{ Querystring: { mode?: string } }>("/api/v1/imports", async (request, reply) => {
    const mode = request.query.mode;
    if (mode !== "MERGE" && mode !== "REPLACE") {
      return reply.code(400).send({ error: { code: "IMPORT_MODE_REQUIRED", message: "请选择合并或完整替换恢复模式。" } });
    }
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: { code: "FILE_REQUIRED", message: "请选择 PromptVault ZIP 备份。" } });
    try { return await importer.restore(await file.toBuffer(), mode); }
    catch (error) {
      const code = error instanceof Error ? error.message : "IMPORT_FAILED";
      return reply.code(400).send({ error: { code, message: code === "IMPORT_PRE_BACKUP_FAILED" ? "自动创建恢复前备份失败，未修改任何数据。" : "恢复备份失败，未完成导入。" } });
    }
  });
}
