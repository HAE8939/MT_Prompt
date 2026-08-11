import multipart from "@fastify/multipart";
import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { AssetService } from "./asset.service.js";
import type { StorageAdapter } from "./storage-adapter.js";

export async function registerAssetRoutes(app: FastifyInstance, prisma: PrismaClient, storage: StorageAdapter) {
  await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024, files: 1 } });
  const service = new AssetService(storage, { create: (input) => prisma.asset.create({ data: input }) });

  app.post<{ Params: { promptId: string } }>("/api/v1/prompts/:promptId/assets", async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: { code: "FILE_REQUIRED", message: "请选择图片文件。" } });
    const roleField = file.fields.role;
    const roleValue = roleField && !Array.isArray(roleField) && "value" in roleField ? roleField.value : undefined;
    if (typeof roleValue !== "string" || !["COVER", "REFERENCE", "RESULT", "COMPARISON"].includes(roleValue)) {
      return reply.code(400).send({ error: { code: "ASSET_ROLE_REQUIRED", message: "请选择图片用途。" } });
    }
    try {
      const asset = await service.upload(request.params.promptId, { buffer: await file.toBuffer(), mimeType: file.mimetype, originalName: file.filename, role: roleValue as "COVER" | "REFERENCE" | "RESULT" | "COMPARISON" });
      return reply.code(201).send(asset);
    } catch (error) {
      if (error instanceof Error && error.message === "UNSUPPORTED_ASSET") return reply.code(415).send({ error: { code: error.message, message: "仅支持 PNG、JPEG、WebP 和 AVIF。" } });
      if (error instanceof Error && error.message === "ASSET_TOO_LARGE") return reply.code(413).send({ error: { code: error.message, message: "图片不能超过 25 MB。" } });
      throw error;
    }
  });

  app.get<{ Params: { id: string } }>("/api/v1/assets/:id/content", async (request, reply) => {
    const asset = await prisma.asset.findUnique({ where: { id: request.params.id }, select: { storageKey: true, mimeType: true } });
    if (!asset) return reply.code(404).send({ error: { code: "ASSET_NOT_FOUND", message: "素材不存在。" } });
    reply.type(asset.mimeType);
    return reply.send(await storage.createReadStream(asset.storageKey));
  });

  app.delete<{ Params: { id: string } }>("/api/v1/assets/:id", async (request, reply) => {
    const asset = await prisma.asset.findUnique({ where: { id: request.params.id }, select: { id: true, storageKey: true } });
    if (!asset) return reply.code(404).send({ error: { code: "ASSET_NOT_FOUND", message: "素材不存在。" } });
    await prisma.asset.delete({ where: { id: asset.id } });
    await storage.remove(asset.storageKey);
    return reply.code(204).send();
  });
}
