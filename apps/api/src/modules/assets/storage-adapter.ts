export type AssetRole = "COVER" | "REFERENCE" | "RESULT" | "COMPARISON";

export type StoredObject = { key: string; byteSize: number; checksum: string };

export interface StorageAdapter {
  put(input: { buffer: Buffer; extension: string; role: AssetRole }): Promise<StoredObject>;
  remove(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  createReadStream(key: string): Promise<NodeJS.ReadableStream>;
}
