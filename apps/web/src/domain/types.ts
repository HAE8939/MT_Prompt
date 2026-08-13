export type MediaType = "IMAGE" | "VIDEO";

export type AssetRole = "COVER" | "REFERENCE" | "RESULT" | "COMPARISON";

export type KnowledgeKind = "TEMPLATE" | "SKILL" | "RULE";

export type KnowledgeOwner = "BUILT_IN" | "USER";

export interface ModelProfile {
  stableKey: string;
  name: string;
  provider: string;
  mediaType: MediaType;
  description: string;
  order: number;
}

export interface ModelTask {
  stableKey: string;
  modelKey: string;
  nameZh: string;
  nameEn: string;
  capabilities: readonly string[];
  sectionOrder: readonly string[];
  order: number;
}

export interface TemplateFieldSchema {
  fields: Array<{
    name: string;
    labelZh: string;
    labelEn: string;
    type: "textarea";
    required: boolean;
  }>;
}

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
  modelKeys?: readonly string[];
  taskKey?: string;
  fieldSchema?: TemplateFieldSchema;
  conflictGroup?: string | null;
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

const MAX_PROMPT_DATA_DEPTH = 100;
const MAX_PROMPT_DATA_VALUES = 10_000;

interface TraversalFrame {
  value: unknown;
  depth: number;
  exiting: boolean;
}

export function isProviderFreePromptData(value: unknown): boolean {
  const stack: TraversalFrame[] = [{ value, depth: 0, exiting: false }];
  const activeObjects = new WeakSet<object>();
  let visitedValues = 0;

  while (stack.length > 0) {
    const frame = stack.pop();
    if (!frame) {
      continue;
    }

    if (frame.exiting) {
      activeObjects.delete(frame.value as object);
      continue;
    }

    visitedValues += 1;
    if (
      visitedValues > MAX_PROMPT_DATA_VALUES ||
      frame.depth > MAX_PROMPT_DATA_DEPTH
    ) {
      return false;
    }

    if (frame.value === null || typeof frame.value !== "object") {
      continue;
    }

    if (activeObjects.has(frame.value)) {
      return false;
    }

    activeObjects.add(frame.value);
    stack.push({ ...frame, exiting: true });

    for (const [key, nestedValue] of Object.entries(frame.value)) {
      const normalizedKey = key.toLowerCase();
      if (normalizedKey === "provider" || normalizedKey === "providersettings") {
        return false;
      }

      stack.push({
        value: nestedValue,
        depth: frame.depth + 1,
        exiting: false,
      });
    }
  }

  return true;
}
