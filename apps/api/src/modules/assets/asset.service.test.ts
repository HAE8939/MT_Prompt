import { describe, expect, it, vi } from "vitest";
import { AssetService, type AssetRepository, type UploadedAsset } from "./asset.service.js";
import type { StorageAdapter } from "./storage-adapter.js";

const file: UploadedAsset = {
  buffer: Buffer.from("fake-image"),
  mimeType: "image/png",
  originalName: "cover.png",
  role: "COVER",
  width: 1200,
  height: 800,
};

function storageFake() {
  return {
    put: vi.fn().mockResolvedValue({ key: "images/2026/08/cover/test.png", byteSize: file.buffer.length, checksum: "hash" }),
    remove: vi.fn().mockResolvedValue(undefined),
  } satisfies Pick<StorageAdapter, "put" | "remove">;
}

describe("AssetService", () => {
  it("removes the stored file when asset persistence fails", async () => {
    const storage = storageFake();
    const repository: AssetRepository = { create: vi.fn().mockRejectedValue(new Error("db failed")) };
    const service = new AssetService(storage, repository);

    await expect(service.upload("prompt-id", file)).rejects.toThrow("db failed");
    expect(storage.remove).toHaveBeenCalledWith("images/2026/08/cover/test.png");
  });

  it("rejects unsupported media and oversized files before storage", async () => {
    const storage = storageFake();
    const repository: AssetRepository = { create: vi.fn() };
    const service = new AssetService(storage, repository);

    await expect(service.upload("prompt-id", { ...file, mimeType: "application/pdf" })).rejects.toThrow("UNSUPPORTED_ASSET");
    await expect(service.upload("prompt-id", { ...file, buffer: Buffer.alloc(25 * 1024 * 1024 + 1) })).rejects.toThrow("ASSET_TOO_LARGE");
    expect(storage.put).not.toHaveBeenCalled();
  });

  it("accepts common video formats and preserves their extension", async () => {
    const storage = storageFake();
    const repository: AssetRepository = { create: vi.fn().mockResolvedValue({ id: "video-1", mimeType: "video/mp4" }) };
    const service = new AssetService(storage, repository);
    await service.upload("prompt-id", { ...file, mimeType: "video/mp4", originalName: "clip.mp4" });
    expect(storage.put).toHaveBeenCalledWith(expect.objectContaining({ extension: "mp4" }));
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ mimeType: "video/mp4" }));
  });
});
