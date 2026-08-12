export type MediaType = "IMAGE" | "VIDEO";

export type AssetRole = "COVER" | "REFERENCE" | "RESULT" | "COMPARISON";

export type KnowledgeKind = "TEMPLATE" | "SKILL" | "RULE";

export type KnowledgeOwner = "BUILT_IN" | "USER";

export interface PromptAsset {
  id: string;
  promptId: string;
  role: AssetRole;
  blob: Blob;
  mimeType: string;
  originalName: string;
  byteSize: number;
  checksum: string;
  width?: number;
  height?: number;
  createdAt: string;
}

export interface ProvenanceSnapshot {
  compilerVersion: string;
  template?: KnowledgeRecord;
  skills: KnowledgeRecord[];
  createdAt: string;
}

export interface PromptRecord {
  id: string;
  title: string;
  description: string;
  contentZh: string;
  contentEn: string;
  negativeZh: string;
  negativeEn: string;
  mediaType: MediaType;
  category: string;
  tags: string[];
  favorite: boolean;
  rating: number;
  origin: "MANUAL" | "GENERATED" | "IMPORTED" | "BUILT_IN";
  provenance?: ProvenanceSnapshot;
  createdAt: string;
  updatedAt: string;
}

export interface PromptVersion {
  id: string;
  promptId: string;
  version: number;
  snapshot: PromptRecord;
  changeNote: string;
  createdAt: string;
}

export interface KnowledgeRecord {
  id: string;
  stableKey: string;
  kind: KnowledgeKind;
  owner: KnowledgeOwner;
  nameZh: string;
  nameEn: string;
  contentZh: string;
  contentEn: string;
  enabled: boolean;
  version: number;
  priority: number;
  category: string;
  updatedAt: string;
}

export interface ProviderSettings {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface InterfaceSettings {
  theme: "system" | "light" | "dark";
  language: "zh-CN";
  libraryView: "list" | "grid";
  compact: boolean;
}

export function isProviderFreePromptData(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.every(isProviderFreePromptData);
  }

  if (value !== null && typeof value === "object") {
    return Object.entries(value).every(
      ([key, nestedValue]) =>
        !["provider", "providersettings"].includes(key.toLowerCase()) &&
        isProviderFreePromptData(nestedValue),
    );
  }

  return true;
}
