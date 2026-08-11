import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { registerExportRoutes } from "./export.routes.js";

describe("import routes", () => {
  it("restores a multipart backup in the explicitly selected mode", async () => {
    const app = Fastify();
    await app.register(multipart);
    const importer = {
      validate: vi.fn(),
      preview: vi.fn(),
      restore: vi.fn(async () => ({ mode: "MERGE", promptCount: 2, restoredAssets: 1 })),
    };
    await registerExportRoutes(app, {} as never, undefined, importer as never);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/imports?mode=MERGE",
      headers: { "content-type": "multipart/form-data; boundary=promptvault" },
      payload: multipartBody("promptvault", Buffer.from("zip bytes")),
    });

    expect(response.statusCode).toBe(200);
    expect(importer.restore).toHaveBeenCalledWith(Buffer.from("zip bytes"), "MERGE");
    await app.close();
  });

  it("rejects a restore without an explicit mode", async () => {
    const app = Fastify();
    await app.register(multipart);
    await registerExportRoutes(app, {} as never, undefined, { restore: vi.fn() } as never);
    const response = await app.inject({ method: "POST", url: "/api/v1/imports" });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("IMPORT_MODE_REQUIRED");
    await app.close();
  });
});

function multipartBody(boundary: string, content: Buffer) {
  return Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="backup.zip"\r\nContent-Type: application/zip\r\n\r\n`),
    content,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
}
