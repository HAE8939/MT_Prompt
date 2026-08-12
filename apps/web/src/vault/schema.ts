export const VAULT_NAME = "mt-prompt-vault";
export const VAULT_VERSION = 1;

export const STORES = [
  "prompts",
  "assets",
  "versions",
  "knowledge",
  "settings",
  "meta",
] as const;

export type StoreName = (typeof STORES)[number];

export function upgradeVault(database: IDBDatabase): void {
  const prompts = database.createObjectStore("prompts", { keyPath: "id" });
  prompts.createIndex("updatedAt", "updatedAt");
  prompts.createIndex("mediaType", "mediaType");
  prompts.createIndex("favorite", "favorite");

  const assets = database.createObjectStore("assets", { keyPath: "id" });
  assets.createIndex("promptId", "promptId");

  const versions = database.createObjectStore("versions", { keyPath: "id" });
  versions.createIndex("promptId", "promptId");

  const knowledge = database.createObjectStore("knowledge", { keyPath: "id" });
  knowledge.createIndex("stableKey", "stableKey", { unique: false });
  knowledge.createIndex("kind", "kind");

  database.createObjectStore("settings", { keyPath: "key" });
  database.createObjectStore("meta", { keyPath: "key" });
}
