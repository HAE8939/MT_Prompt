import type {
  InterfaceSettings,
  KnowledgeKind,
  KnowledgeRecord,
  MediaType,
  PromptAsset,
  PromptRecord,
  PromptVersion,
  ProviderSettings,
} from "../domain/types";

export interface PromptQuery {
  keyword?: string;
  mediaType?: MediaType;
  favorite?: boolean;
  sort: "updatedAt" | "createdAt" | "rating" | "title";
  order: "asc" | "desc";
}

export interface PromptRepository {
  list(query: PromptQuery): Promise<PromptRecord[]>;
  get(id: string): Promise<PromptRecord | undefined>;
  create(prompt: PromptRecord, assets: PromptAsset[]): Promise<PromptRecord>;
  update(id: string, patch: Partial<PromptRecord>, changeNote: string): Promise<PromptRecord>;
  remove(id: string): Promise<void>;
  listAssets(promptId: string): Promise<PromptAsset[]>;
  addAsset(asset: PromptAsset): Promise<void>;
  removeAsset(assetId: string): Promise<void>;
  listVersions(promptId: string): Promise<PromptVersion[]>;
  restoreVersion(promptId: string, versionId: string): Promise<PromptRecord>;
}

export interface KnowledgeRepository {
  list(kind?: KnowledgeKind): Promise<KnowledgeRecord[]>;
  get(id: string): Promise<KnowledgeRecord | undefined>;
  save(record: KnowledgeRecord): Promise<KnowledgeRecord>;
  remove(id: string): Promise<void>;
}

export interface SettingsRepository {
  getProvider(): Promise<ProviderSettings | undefined>;
  saveProvider(settings: ProviderSettings): Promise<void>;
  clearProvider(): Promise<void>;
  getInterface(): Promise<InterfaceSettings>;
  saveInterface(settings: InterfaceSettings): Promise<void>;
  getPortableInterface(): Promise<InterfaceSettings>;
}

export interface ImportWriteBundle {
  prompts: PromptRecord[];
  assets: PromptAsset[];
  versions: PromptVersion[];
  knowledge: KnowledgeRecord[];
  interfaceSettings?: InterfaceSettings;
  meta: Array<{ key: string; value: unknown }>;
}

export interface VaultTransaction {
  importBundle(bundle: ImportWriteBundle): Promise<void>;
}
