import type { AssetRole } from "@prisma/client";
import type { StorageAdapter } from "./storage-adapter.js";

export type UploadedAsset = {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  role: AssetRole;
  width?: number;
  height?: number;
};

export type AssetRepository = {
  create(input: {
    promptId: string;
    role: AssetRole;
    storageKey: string;
    mimeType: string;
    originalName: string;
    width?: number;
    height?: number;
    byteSize: number;
    checksum: string;
  }): Promise<unknown>;
};

const allowedMime = new Set(["image/png", "image/jpeg", "image/webp", "image/avif", "video/mp4", "video/webm", "video/quicktime"]);
const extensionByMime: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/avif": "avif", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
const maxBytes = 25 * 1024 * 1024;

export class AssetService {
  constructor(private readonly storage: Pick<StorageAdapter, "put" | "remove">, private readonly repository: AssetRepository) {}

  async upload(promptId: string, file: UploadedAsset) {
    if (!allowedMime.has(file.mimeType)) throw new Error("UNSUPPORTED_ASSET");
    if (file.buffer.byteLength > maxBytes) throw new Error("ASSET_TOO_LARGE");
    const stored = await this.storage.put({ buffer: file.buffer, extension: extensionByMime[file.mimeType]!, role: file.role });
    try {
      return await this.repository.create({
        promptId, role: file.role, storageKey: stored.key, mimeType: file.mimeType,
        originalName: file.originalName, width: file.width, height: file.height,
        byteSize: stored.byteSize, checksum: stored.checksum,
      });
    } catch (error) {
      await this.storage.remove(stored.key);
      throw error;
    }
  }
}
