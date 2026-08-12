export const PROMPT_PACKAGE_VERSION = 1 as const;
export const PACKAGE_LIMITS = { compressedBytes: 512 * 1024 * 1024, uncompressedBytes: 1024 * 1024 * 1024, entryBytes: 512 * 1024 * 1024, entries: 2000 } as const;
export const portableSettingKeys = ["theme", "language", "libraryView", "compact"] as const;
export type PromptManifest = { format: "mt-prompt"; version: 1; createdAt: string; promptCount: number; sections: { settings: boolean; knowledge: boolean }; entries: Array<{ path: string; bytes: number; sha256: string }> };
export class PromptPackageError extends Error { constructor(public readonly code: string, message: string) { super(message); this.name = "PromptPackageError"; } }
