import Fastify from "fastify";
import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { registerAssetRoutes } from "./asset.routes.js";

describe("asset content route", () => {
  it("streams a stored asset with its media type", async () => {
    const app = Fastify();
    const prisma = { asset: { findUnique: vi.fn().mockResolvedValue({ id: "a1", storageKey: "cover/a1.webp", mimeType: "image/webp" }) } };
    const storage = { put: vi.fn(), remove: vi.fn(), createReadStream: vi.fn().mockResolvedValue(Readable.from(Buffer.from("webp"))) };
    await registerAssetRoutes(app, prisma as never, storage as never);
    const response = await app.inject({ method: "GET", url: "/api/v1/assets/a1/content" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("image/webp");
    expect(response.body).toBe("webp");
    await app.close();
  });

  it("deletes an asset record and its stored file", async () => {
    const app = Fastify();
    const asset = { id: "a1", storageKey: "cover/a1.webp", mimeType: "image/webp" };
    const prisma = { asset: { findUnique: vi.fn().mockResolvedValue(asset), delete: vi.fn().mockResolvedValue(asset), create: vi.fn() } };
    const storage = { put: vi.fn(), remove: vi.fn().mockResolvedValue(undefined), createReadStream: vi.fn() };
    await registerAssetRoutes(app, prisma as never, storage as never);

    const response = await app.inject({ method: "DELETE", url: "/api/v1/assets/a1" });

    expect(response.statusCode).toBe(204);
    expect(prisma.asset.delete).toHaveBeenCalledWith({ where: { id: "a1" } });
    expect(storage.remove).toHaveBeenCalledWith("cover/a1.webp");
    await app.close();
  });
});
