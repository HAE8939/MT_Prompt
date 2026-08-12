# MT-Prompt Browser Vault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert PromptVault into the lightweight, responsive MT-Prompt application whose user data lives in each browser's IndexedDB and is shared through safe `.prompt` packages, while Docker retains only static delivery and a stateless Provider proxy.

**Architecture:** Introduce typed browser repository interfaces in `apps/web`, back them with versioned native IndexedDB stores, and move all local Prompt, asset, knowledge, settings, compilation, and transfer workflows behind those interfaces. Keep Fastify only for static/health delivery and constrained OpenAI-compatible forwarding; retire Prisma and server-side user storage only after conversion and browser acceptance tests pass.

**Tech Stack:** React 19, TypeScript, native IndexedDB, `fake-indexeddb`, TanStack Query, `fflate`, Web Crypto, Fastify, `@fastify/static`, Zod, Vitest, Testing Library, Playwright, Docker.

---

## File Responsibility Map

### Browser domain and persistence

- `apps/web/src/domain/types.ts`: storage-independent Prompt, asset, knowledge, version, settings, and provenance types.
- `apps/web/src/vault/errors.ts`: typed durable-storage errors and browser error normalization.
- `apps/web/src/vault/schema.ts`: database/store names, schema version, indexes, and upgrade transaction.
- `apps/web/src/vault/open-vault.ts`: one shared `IDBDatabase` connection and blocked/version-change handling.
- `apps/web/src/vault/idb-helpers.ts`: promise wrappers for requests and transactions.
- `apps/web/src/vault/prompt-repository.ts`: Prompt query, create, update, delete, versions, and asset transactions.
- `apps/web/src/vault/knowledge-repository.ts`: template, Skill, rule, and built-in ownership operations.
- `apps/web/src/vault/settings-repository.ts`: Provider settings and allowlisted interface preferences.
- `apps/web/src/vault/initialize-vault.ts`: ordered migrations and one-time ten-example initialization.
- `apps/web/src/vault/VaultProvider.tsx`: repository composition and React context.

### Portable packages and legacy migration

- `apps/web/src/transfer/package-format.ts`: `.prompt` manifest schemas, allowlists, limits, and serialized types.
- `apps/web/src/transfer/export-prompt.ts`: selected Prompt/media/provenance/settings/knowledge packaging.
- `apps/web/src/transfer/validate-prompt.ts`: ZIP safety, checksum, format, and semantic validation.
- `apps/web/src/transfer/import-prompt.ts`: preview conflict plan and atomic merge.
- `apps/web/src/transfer/ImportPromptDialog.tsx`: preview and optional-section confirmation.
- `apps/web/src/transfer/ExportPromptDialog.tsx`: selection and optional-section controls.
- `scripts/export-legacy-vault.ts`: explicit SQLite/filesystem-to-`.prompt` conversion utility retained only for migration.

### Frontend features and brand

- `apps/web/src/assets/logo.svg`: supplied MT logo using `currentColor`.
- `apps/web/src/app/AppShell.tsx`: approved B-direction responsive navigation.
- `apps/web/src/features/library/*`: local repository-backed list/grid, selection, detail drawer, editor, import/export.
- `apps/web/src/features/generator/*`: browser compiler, Provider enhancement, and save/export actions.
- `apps/web/src/features/knowledge/*`: tabbed local knowledge management.
- `apps/web/src/features/settings/*`: local Provider/interface/data settings; no quota panel.
- `apps/web/src/styles.css`: tokens and three responsive navigation/layout modes.

### Stateless service and deployment

- `apps/api/src/app.ts`: health, static delivery registration, safe logging, and Provider route only.
- `apps/api/src/modules/provider/provider.routes.ts`: constrained forwarding endpoint contract.
- `apps/api/src/modules/provider/provider-proxy.ts`: timeout, URL validation, redaction, and upstream forwarding.
- `Dockerfile`, `.dockerignore`: multi-stage minimal production image.
- `docker-compose.yml`: LAN-facing service without persistent data volume.

## Delivery Rule

Do not delete `database/`, `storage/`, Prisma code, or the original 50-Prompt import source during Tasks 1-6. Task 12 may remove production references only after the conversion comparison and all browser/Docker acceptance tests pass. Preserve the original runtime data as a recoverable local migration source.

---

### Task 1: Establish MT-Prompt Brand and Browser Domain Types

**Files:**
- Create: `apps/web/src/assets/logo.svg`
- Create: `apps/web/src/domain/types.ts`
- Create: `apps/web/src/domain/types.test.ts`
- Modify: `apps/web/index.html`
- Modify: `package.json`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Write the failing domain serialization test**

```ts
// apps/web/src/domain/types.test.ts
import { describe, expect, it } from "vitest";
import { isProviderFreePromptData } from "./types";

describe("Prompt export boundary", () => {
  it("rejects Provider fields in portable data", () => {
    expect(isProviderFreePromptData({ title: "椁愭", contentZh: "榛戣儭妗?, provider: { apiKey: "secret" } })).toBe(false);
    expect(isProviderFreePromptData({ title: "椁愭", contentZh: "榛戣儭妗? })).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test and verify the missing module/function failure**

Run: `npm --workspace @promptvault/web test -- --run src/domain/types.test.ts`

Expected: FAIL because `domain/types.ts` and `isProviderFreePromptData` do not exist.

- [ ] **Step 3: Add storage-independent domain types and a recursive Provider-field guard**

```ts
// apps/web/src/domain/types.ts
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

export interface ProviderSettings { baseUrl: string; model: string; apiKey: string; }
export interface InterfaceSettings { theme: "system" | "light" | "dark"; language: "zh-CN"; libraryView: "list" | "grid"; compact: boolean; }

export function isProviderFreePromptData(value: unknown): boolean {
  if (!value || typeof value !== "object") return true;
  if (Array.isArray(value)) return value.every(isProviderFreePromptData);
  return Object.entries(value).every(([key, child]) => key.toLowerCase() !== "provider" && key.toLowerCase() !== "providersettings" && isProviderFreePromptData(child));
}
```

- [ ] **Step 4: Copy the supplied SVG, update visible metadata, and add transfer dependencies**

Copy `C:\Users\huaiw\Desktop\TEMP\logo.svg` to `apps/web/src/assets/logo.svg`, retaining `fill: currentColor`. Change `apps/web/index.html` title to `MT-Prompt` and the root package `name` to `mt-prompt`. Keep existing internal workspace package names during migration so package identity churn does not obscure functional changes. Add `@promptvault/compiler` and `fflate` to web dependencies, plus `fake-indexeddb` to web dev dependencies. Run `npm install` to update the lockfile.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `npm --workspace @promptvault/web test -- --run src/domain/types.test.ts`

Expected: PASS, 2 assertions.

Run: `npm --workspace @promptvault/web run typecheck`

Expected: PASS with exit code 0.

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json apps/web/package.json apps/web/index.html apps/web/src/assets/logo.svg apps/web/src/domain
git commit -m "feat: establish MT-Prompt browser domain"
```

---

### Task 2: Build the Versioned IndexedDB Foundation and Ten-Example Initialization

**Files:**
- Create: `apps/web/src/vault/errors.ts`
- Create: `apps/web/src/vault/idb-helpers.ts`
- Create: `apps/web/src/vault/schema.ts`
- Create: `apps/web/src/vault/open-vault.ts`
- Create: `apps/web/src/vault/initialize-vault.ts`
- Create: `apps/web/src/vault/example-prompts.ts`
- Create: `apps/web/src/vault/initialize-vault.test.ts`
- Modify: `apps/web/src/test-setup.ts`

- [ ] **Step 1: Configure in-memory IndexedDB and write the failing initialization test**

```ts
// append to apps/web/src/test-setup.ts
import "fake-indexeddb/auto";
```

```ts
// apps/web/src/vault/initialize-vault.test.ts
import { afterEach, describe, expect, it } from "vitest";
import { deleteVault, openVault } from "./open-vault";
import { initializeVault } from "./initialize-vault";
import { requestResult, transactionDone } from "./idb-helpers";

afterEach(() => deleteVault());

describe("initializeVault", () => {
  it("imports exactly ten examples once", async () => {
    await initializeVault();
    await initializeVault();
    const db = await openVault();
    const tx = db.transaction("prompts", "readonly");
    expect(await requestResult(tx.objectStore("prompts").count())).toBe(10);
    await transactionDone(tx);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails because the Vault modules are missing**

Run: `npm --workspace @promptvault/web test -- --run src/vault/initialize-vault.test.ts`

Expected: FAIL with module resolution errors for `open-vault` and `initialize-vault`.

- [ ] **Step 3: Implement request/transaction helpers and schema upgrade**

```ts
// apps/web/src/vault/schema.ts
export const VAULT_NAME = "mt-prompt-vault";
export const VAULT_VERSION = 1;
export const STORES = ["prompts", "assets", "versions", "knowledge", "settings", "meta"] as const;
export type StoreName = typeof STORES[number];

export function upgradeVault(db: IDBDatabase) {
  const prompts = db.createObjectStore("prompts", { keyPath: "id" });
  prompts.createIndex("updatedAt", "updatedAt");
  prompts.createIndex("mediaType", "mediaType");
  prompts.createIndex("favorite", "favorite");
  const assets = db.createObjectStore("assets", { keyPath: "id" });
  assets.createIndex("promptId", "promptId");
  const versions = db.createObjectStore("versions", { keyPath: "id" });
  versions.createIndex("promptId", "promptId");
  const knowledge = db.createObjectStore("knowledge", { keyPath: "id" });
  knowledge.createIndex("stableKey", "stableKey", { unique: false });
  knowledge.createIndex("kind", "kind");
  db.createObjectStore("settings", { keyPath: "key" });
  db.createObjectStore("meta", { keyPath: "key" });
}
```

Implement `requestResult<T>(request)` and `transactionDone(transaction)` as Promise adapters that reject with `VaultError`. Implement `openVault()` using `indexedDB.open(VAULT_NAME, VAULT_VERSION)`, call `upgradeVault` only when `oldVersion === 0`, close on `versionchange`, and expose `deleteVault()` for isolated tests.

- [ ] **Step 4: Add the exact approved examples and idempotent initialization**

`example-prompts.ts` exports exactly ten `PromptRecord` objects with stable IDs `builtin-prompt-01` through `builtin-prompt-10`, the approved Chinese titles, bilingual content and `origin: "BUILT_IN"`. `initializeVault()` checks `meta.exampleSetVersion`; if absent, it adds only IDs not already present and writes `{ key: "exampleSetVersion", value: 1 }` in the same `prompts`/`meta` transaction.

- [ ] **Step 5: Verify idempotence and exact title set**

Extend the test to compare sorted titles against the ten approved titles, then run:

`npm --workspace @promptvault/web test -- --run src/vault/initialize-vault.test.ts`

Expected: PASS; count remains 10 after two initializations.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/test-setup.ts apps/web/src/vault
git commit -m "feat: initialize the browser Vault"
```

---

### Task 3: Implement Prompt, Asset, Version, Knowledge, and Settings Repositories

**Files:**
- Create: `apps/web/src/vault/repository-types.ts`
- Create: `apps/web/src/vault/prompt-repository.ts`
- Create: `apps/web/src/vault/knowledge-repository.ts`
- Create: `apps/web/src/vault/settings-repository.ts`
- Create: `apps/web/src/vault/VaultProvider.tsx`
- Create: `apps/web/src/vault/prompt-repository.test.ts`
- Create: `apps/web/src/vault/knowledge-repository.test.ts`
- Create: `apps/web/src/vault/settings-repository.test.ts`
- Modify: `apps/web/src/app/App.tsx`

- [ ] **Step 1: Write failing transaction and credential-isolation tests**

```ts
it("creates a new version and updates a Prompt atomically", async () => {
  const created = await prompts.create(makePrompt("p1"), [makeAsset("a1", "p1")]);
  await prompts.update(created.id, { title: "鏂扮増椁愭" }, "淇敼鏍囬");
  expect((await prompts.get(created.id))?.title).toBe("鏂扮増椁愭");
  expect(await prompts.listVersions(created.id)).toHaveLength(2);
});

it("keeps Provider settings separate from interface settings", async () => {
  await settings.saveProvider({ baseUrl: "https://example.com", model: "m", apiKey: "secret" });
  await settings.saveInterface({ theme: "light", language: "zh-CN", libraryView: "list", compact: true });
  expect(await settings.getProvider()).toEqual({ baseUrl: "https://example.com", model: "m", apiKey: "secret" });
  expect(JSON.stringify(await settings.getPortableInterface())).not.toContain("secret");
});
```

- [ ] **Step 2: Run repository tests and verify missing implementations fail**

Run: `npm --workspace @promptvault/web test -- --run src/vault/*repository.test.ts`

Expected: FAIL because repository constructors and methods do not exist.

- [ ] **Step 3: Define repository interfaces**

```ts
export interface PromptQuery { keyword?: string; mediaType?: MediaType; favorite?: boolean; sort: "updatedAt" | "createdAt" | "rating" | "title"; order: "asc" | "desc"; }
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
export interface VaultTransaction {
  importBundle(bundle: ImportWriteBundle): Promise<void>;
}
```

Define comparable `KnowledgeRepository` CRUD/copy interfaces and `SettingsRepository` methods `getProvider`, `saveProvider`, `clearProvider`, `getInterface`, `saveInterface`, and `getPortableInterface`. Define `ImportWriteBundle` with prepared Prompt, asset, initial-version, knowledge, interface-setting, and meta records. `VaultTransaction.importBundle` is the only cross-store bulk write entry point.

- [ ] **Step 4: Implement atomic repositories**

Use `prompts` + `versions` in one readwrite transaction for create/update/restore. Use `prompts` + `assets` + `versions` for Prompt creation with media and deletion. Search normalized lower-case title, description, bilingual content, category, and tags in memory because the Vault is device-local; sort with a stable ID tie-breaker. Never broaden a transaction to unrelated settings.

Knowledge edits to `owner: "BUILT_IN"` create a new UUID record with `owner: "USER"`; they do not mutate the built-in record. Settings store keys `provider` and `interface` separately.

- [ ] **Step 5: Compose repositories through React context**

`VaultProvider` calls `initializeVault()`, constructs repositories once, renders a loading state during initialization, a blocking storage error on failure, and exposes `useVault()` only after successful initialization. Wrap the router in `apps/web/src/app/App.tsx`.

- [ ] **Step 6: Run repository and current component tests**

Run: `npm --workspace @promptvault/web test -- --run src/vault`

Expected: PASS for create/update/version rollback, asset relationship, built-in copy, and settings isolation.

Run: `npm --workspace @promptvault/web run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add apps/web/src/app/App.tsx apps/web/src/vault
git commit -m "feat: add transactional browser repositories"
```

---

### Task 4: Run the Compiler and Knowledge Selection in the Browser

**Files:**
- Create: `apps/web/src/features/generator/browser-compiler.ts`
- Create: `apps/web/src/features/generator/browser-compiler.test.ts`
- Modify: `packages/compiler/src/index.ts`
- Modify: `packages/compiler/src/compile.test.ts`
- Modify: `apps/web/src/features/generator/GeneratorPage.tsx`

- [ ] **Step 1: Write a failing browser compilation test**

```ts
it("produces local Chinese output and a provenance snapshot without a Provider", () => {
  const result = compileInBrowser({
    template: templateFixture,
    skills: [skillFixture],
    inputValues: { requirements: "灏嗘瘺鍧埧鏀逛负鐜颁唬瀹㈠巺" },
  });
  expect(result.contentZh).toContain("灏嗘瘺鍧埧鏀逛负鐜颁唬瀹㈠巺");
  expect(result.provenance.template?.stableKey).toBe(templateFixture.stableKey);
  expect(result.provenance.skills).toHaveLength(1);
});
```

- [ ] **Step 2: Verify failure before adding the adapter**

Run: `npm --workspace @promptvault/web test -- --run src/features/generator/browser-compiler.test.ts`

Expected: FAIL because `compileInBrowser` is missing.

- [ ] **Step 3: Add a pure browser adapter around `@promptvault/compiler`**

Map `KnowledgeRecord` templates/Skills and form values into the existing pure compiler input. Return Chinese/English deterministic output plus deep-cloned `ProvenanceSnapshot`; do not call `fetch` and do not persist inside the compiler function. Add browser-compatible exports to `packages/compiler` only where the existing API lacks them.

- [ ] **Step 4: Replace generator knowledge/compile API reads with repositories**

Load enabled templates and compatible Skills through `KnowledgeRepository`. Compile locally on form submission. Save generated results through `PromptRepository`. Keep Provider translation/optimization as a separate optional action that uses the proxy client introduced in Task 9.

- [ ] **Step 5: Verify compiler and generator tests**

Run: `npm --workspace @promptvault/compiler test -- --run`

Expected: all compiler tests PASS.

Run: `npm --workspace @promptvault/web test -- --run src/features/generator`

Expected: generator tests PASS and assert no `/api/v1/compiler` request.

- [ ] **Step 6: Commit**

```powershell
git add packages/compiler apps/web/src/features/generator
git commit -m "feat: compile Prompts in the browser"
```

---

### Task 5: Implement Safe `.prompt` Export and Validation

**Files:**
- Create: `apps/web/src/transfer/package-format.ts`
- Create: `apps/web/src/transfer/hash.ts`
- Create: `apps/web/src/transfer/export-prompt.ts`
- Create: `apps/web/src/transfer/validate-prompt.ts`
- Create: `apps/web/src/transfer/export-prompt.test.ts`
- Create: `apps/web/src/transfer/validate-prompt.test.ts`

- [ ] **Step 1: Write failing sensitive-field and path-traversal tests**

```ts
it("never exports Provider URL, model, or key", async () => {
  const blob = await exportPromptPackage({ ...fixtures, provider: providerSettings }, {
    includeSettings: true,
    includeKnowledge: true,
    interfaceSettings,
  });
  const text = await unzipAllAsText(blob);
  expect(text).not.toContain("top-secret");
  expect(text).not.toContain("private-model");
  expect(text).not.toContain("secret.example");
});

it("rejects parent traversal", async () => {
  await expect(validatePromptPackage(zip({ "../escape.json": "{}" }))).rejects.toMatchObject({ code: "UNSAFE_ENTRY_PATH" });
});
```

- [ ] **Step 2: Run tests and verify missing format/export failures**

Run: `npm --workspace @promptvault/web test -- --run src/transfer/export-prompt.test.ts src/transfer/validate-prompt.test.ts`

Expected: FAIL because transfer modules do not exist.

- [ ] **Step 3: Define format v1, limits, and allowlists**

```ts
export const PROMPT_PACKAGE_VERSION = 1;
export const PACKAGE_LIMITS = {
  compressedBytes: 512 * 1024 * 1024,
  uncompressedBytes: 1024 * 1024 * 1024,
  entryBytes: 512 * 1024 * 1024,
  entries: 2000,
} as const;
export const portableSettingKeys = ["theme", "language", "libraryView", "compact"] as const;
export type PromptManifest = {
  format: "mt-prompt";
  version: 1;
  createdAt: string;
  promptCount: number;
  sections: { settings: boolean; knowledge: boolean };
  entries: Array<{ path: string; bytes: number; sha256: string }>;
};
```

- [ ] **Step 4: Implement browser export with `fflate` and Web Crypto**

Serialize `prompts.json`, `provenance.json`, optional allowlisted `settings.json`, optional full `knowledge.json`, and `assets/<asset-id>`. Compute SHA-256 before writing the manifest. Accept only selected Prompt IDs. Construct every serialized record from an explicit allowlist; never spread repository objects into portable JSON. Do not accept or reference Provider settings in the public export options. The test deliberately places a Provider object beside the fixture repositories to prove it is unreachable from serialization. A knowledge field named `model` remains valid because only the Provider configuration object is forbidden.

- [ ] **Step 5: Implement validation before semantic parsing**

Check the compressed file size before unzip. During unzip, accumulate total bytes and entry count; reject unsafe names, duplicate names, unknown undeclared entries, disallowed MIME types, unsupported versions, checksum mismatches, malformed JSON, Prompt/asset relationship failures, and forbidden Provider-like keys anywhere in portable JSON.

- [ ] **Step 6: Run transfer tests**

Run: `npm --workspace @promptvault/web test -- --run src/transfer`

Expected: PASS for minimal package, settings option, knowledge option, media checksum, Provider exclusion, excessive limits, traversal, duplicate path, checksum mismatch, and newer version rejection.

- [ ] **Step 7: Commit**

```powershell
git add apps/web/src/transfer apps/web/package.json package-lock.json
git commit -m "feat: add secure Prompt sharing packages"
```

---

### Task 6: Implement Import Preview, Conflict Merge, and Legacy Conversion

**Files:**
- Create: `apps/web/src/transfer/import-prompt.ts`
- Create: `apps/web/src/transfer/import-prompt.test.ts`
- Create: `scripts/export-legacy-vault.ts`
- Create: `scripts/export-legacy-vault.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing conflict tests**

```ts
it("creates a conflict copy instead of overwriting a local Prompt", async () => {
  await prompts.create(localPrompt, []);
  const preview = await previewPromptImport(packageWith({ ...localPrompt, title: "瀵煎叆鐗堟湰" }));
  expect(preview.promptActions).toEqual([{ sourceId: localPrompt.id, action: "COPY", reason: "ID_CONTENT_CONFLICT" }]);
  await applyPromptImport(preview, { includeSettings: false, includeKnowledge: false });
  expect(await prompts.get(localPrompt.id)).toEqual(localPrompt);
  expect((await prompts.list(defaultQuery)).some((item) => item.title === "瀵煎叆鐗堟湰")).toBe(true);
});
```

Add cases for exact duplicate skip, similar-content warning, built-in knowledge protection, user knowledge copy, and partial interface settings merge.

- [ ] **Step 2: Run tests and verify import functions are missing**

Run: `npm --workspace @promptvault/web test -- --run src/transfer/import-prompt.test.ts`

Expected: FAIL on missing `previewPromptImport` and `applyPromptImport`.

- [ ] **Step 3: Implement preview and atomic apply**

`previewPromptImport(blob, repositories)` calls validation, loads local IDs/stable keys, and returns immutable actions plus counts, media summary, optional-section availability, and possible duplicates. `applyPromptImport(preview, selections)` refuses a stale or mutated preview token, prepares an `ImportWriteBundle`, and passes it once to `VaultTransaction.importBundle`. That method opens one readwrite transaction across `prompts`, `assets`, `versions`, `knowledge`, `settings`, and `meta`, then commits all selected sections or aborts all of them. Generate UUIDs for conflict copies and rewrite their asset relationships before opening the transaction.

- [ ] **Step 4: Write the legacy conversion test against a temporary SQLite fixture**

Create one Prompt, one version, one knowledge snapshot, and one asset file in a temporary fixture. Run the converter and validate the result using the same manifest semantics. Assert the source DB and source asset still exist after conversion and no Provider settings appear in the result.

- [ ] **Step 5: Implement the explicit migration-only converter**

`scripts/export-legacy-vault.ts --database <absolute-db> --storage <absolute-dir> --output <absolute-file.prompt> --ids <comma-separated-ids>` reads but never mutates the legacy source. Refuse output paths inside the source storage directory. Reuse package schemas/checksum conventions, select only explicit IDs, and print Prompt count, asset count, missing assets, and output SHA-256.

Add root script:

```json
"migrate:legacy": "tsx scripts/export-legacy-vault.ts"
```

- [ ] **Step 6: Run import and migration tests**

Run: `npm --workspace @promptvault/web test -- --run src/transfer/import-prompt.test.ts`

Expected: PASS for all conflict and optional-section cases.

Run: `npx vitest run scripts/export-legacy-vault.test.ts`

Expected: PASS and source fixture remains intact.

- [ ] **Step 7: Commit**

```powershell
git add apps/web/src/transfer scripts package.json
git commit -m "feat: import Prompt packages without overwrites"
```

---

### Task 7: Rebuild the Prompt Library Around the Browser Vault

**Files:**
- Create: `apps/web/src/features/library/PromptCard.tsx`
- Create: `apps/web/src/features/library/PromptDetailDrawer.tsx`
- Create: `apps/web/src/features/library/LibraryToolbar.tsx`
- Create: `apps/web/src/transfer/ExportPromptDialog.tsx`
- Create: `apps/web/src/transfer/ImportPromptDialog.tsx`
- Modify: `apps/web/src/features/library/LibraryPage.tsx`
- Modify: `apps/web/src/features/library/PromptEditor.tsx`
- Modify: `apps/web/src/features/library/library-fixes.css`
- Modify: `apps/web/src/features/library/LibraryPage.test.tsx`

- [ ] **Step 1: Replace fetch mocks with a failing in-memory repository test**

Render `LibraryPage` inside `VaultProvider` with a test repository. Assert filters `鍏ㄩ儴`, `鍥剧墖`, `瑙嗛`, and `鏀惰棌` change the visible titles; opening a record renders its Blob cover with an object URL; multi-select enables `瀵煎嚭`; imported conflicts display a summary rather than replacing a title.

- [ ] **Step 2: Run the library test and verify it fails on current API behavior**

Run: `npm --workspace @promptvault/web test -- --run src/features/library/LibraryPage.test.tsx`

Expected: FAIL because the page still requests `/api/v1/prompts` and server asset URLs.

- [ ] **Step 3: Split and implement the approved B-direction library components**

`LibraryPage` owns query/filter/view/selection/dialog state. `LibraryToolbar` owns search, segmented filters, list/grid control, import, export, and new actions. `PromptCard` renders compact horizontal list rows by default and grid cards only when selected. `PromptDetailDrawer` loads assets/versions through repositories and revokes every created object URL on cleanup. `PromptEditor` saves Prompt plus pending Blobs transactionally.

- [ ] **Step 4: Implement export/import dialogs**

Export always includes selected Prompts and associated media, with unchecked `搴旂敤璁剧疆` and `瀹屾暣鐭ヨ瘑搴揱 options. Import shows counts, media, conflicts, settings availability, and knowledge availability; optional sections are unchecked until the user selects them. Download filename is `mt-prompt-YYYY-MM-DD.prompt`.

- [ ] **Step 5: Run library and transfer UI tests**

Run: `npm --workspace @promptvault/web test -- --run src/features/library src/transfer/*.test.tsx`

Expected: PASS for filters, detail media, create/edit/version, multi-select export, import preview, and conflict summary.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/features/library apps/web/src/transfer
git commit -m "feat: rebuild the local Prompt library"
```

---

### Task 8: Rebuild Generator and Knowledge Pages on Local Repositories

**Files:**
- Modify: `apps/web/src/features/generator/GeneratorPage.tsx`
- Modify: `apps/web/src/features/generator/generator.css`
- Modify: `apps/web/src/features/generator/GeneratorPage.test.tsx`
- Create: `apps/web/src/features/knowledge/KnowledgeEditor.tsx`
- Modify: `apps/web/src/features/knowledge/KnowledgePage.tsx`
- Modify: `apps/web/src/features/knowledge/knowledge.css`
- Modify: `apps/web/src/features/knowledge/KnowledgePage.test.tsx`

- [ ] **Step 1: Write failing local-workflow component tests**

Generator test: select a template and Skill from a test repository, enter Chinese requirements, compile without fetch, verify Chinese and English result panes, then save a generated Prompt.

Knowledge test: switch among `妯℃澘`, `鎶€鑳絗, `涓汉瑙勫垯`; edit a built-in template and assert a user copy is created while the built-in remains unchanged.

- [ ] **Step 2: Run tests and verify current server dependencies fail**

Run: `npm --workspace @promptvault/web test -- --run src/features/generator src/features/knowledge`

Expected: FAIL because current pages still call models/templates/skills/compiler APIs.

- [ ] **Step 3: Implement the responsive generator**

Use the browser compiler from Task 4. Wide layout uses `minmax(320px, 0.85fr) minmax(420px, 1.15fr)` for form and results. Below 900 px, stack inputs before results. Result actions are copy Chinese, copy English, save to Vault, export, and optional Provider enhancement. A Provider error leaves local output intact.

- [ ] **Step 4: Implement tabbed knowledge management**

Use a page-level segmented/tab control, one search field, and consistent create/edit/enable actions. `KnowledgeEditor` calls repository copy-on-edit semantics for built-ins. Do not nest cards; render dense rows grouped by kind/category.

- [ ] **Step 5: Verify feature tests and accessibility names**

Run: `npm --workspace @promptvault/web test -- --run src/features/generator src/features/knowledge`

Expected: PASS with no API fetches for local knowledge or compilation.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/features/generator apps/web/src/features/knowledge
git commit -m "feat: move generation and knowledge into the Vault"
```

---

### Task 9: Add Device-Local Provider Settings and Browser Proxy Client

**Files:**
- Create: `apps/web/src/lib/provider-client.ts`
- Create: `apps/web/src/lib/provider-client.test.ts`
- Modify: `apps/web/src/features/settings/SettingsPage.tsx`
- Modify: `apps/web/src/features/settings/settings.css`
- Modify: `apps/web/src/features/settings/SettingsPage.test.tsx`

- [ ] **Step 1: Write failing key persistence, clear, and request tests**

```ts
it("sends credentials only with an explicit proxy request", async () => {
  await client.complete({ baseUrl: "https://provider.example/v1", model: "m", apiKey: "secret" }, [{ role: "user", content: "浼樺寲" }]);
  expect(fetch).toHaveBeenCalledWith("/api/provider/chat/completions", expect.objectContaining({ method: "POST" }));
  expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))).toMatchObject({ baseUrl: "https://provider.example/v1", model: "m", apiKey: "secret" });
});
```

Settings tests save all three Provider fields to IndexedDB, verify password masking, test connection, and clear the record. Export tests continue to prove the same values never enter `.prompt`.

- [ ] **Step 2: Run tests and verify missing proxy client/local settings behavior**

Run: `npm --workspace @promptvault/web test -- --run src/lib/provider-client.test.ts src/features/settings/SettingsPage.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement a narrow proxy client**

Expose `testProvider(settings, signal)` and `complete(settings, messages, signal)`. POST only to same-origin `/api/provider/chat/completions`, impose a browser timeout with `AbortController`, normalize timeout/upstream/unavailable errors, and never log the request object.

- [ ] **Step 4: Rebuild Settings into Provider, Interface, and Data sections**

Provider: base URL, model, masked key, save, test, and clear. Interface: theme, fixed Chinese language, default list/grid, compact toggle. Data: import/export entry points. Remove Microsoft translator controls, server backup/restore, integrity scan, storage usage, and quota UI.

- [ ] **Step 5: Run settings and Provider tests**

Run: `npm --workspace @promptvault/web test -- --run src/lib/provider-client.test.ts src/features/settings/SettingsPage.test.tsx src/transfer/export-prompt.test.ts`

Expected: PASS; the clear action removes all Provider fields, and export contains none.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/lib/provider-client.ts apps/web/src/lib/provider-client.test.ts apps/web/src/features/settings
git commit -m "feat: keep Provider settings in the browser"
```

---

### Task 10: Reduce Fastify to a Safe Stateless Provider Proxy

**Files:**
- Create: `apps/api/src/modules/provider/provider-proxy.ts`
- Create: `apps/api/src/modules/provider/provider-proxy.test.ts`
- Create: `apps/api/src/modules/provider/provider.routes.ts`
- Create: `apps/api/src/modules/provider/provider.routes.test.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/server.ts`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Write failing URL, redaction, timeout, and forwarding tests**

Test rejection of `file:`, localhost, loopback, link-local, private network upstreams, credentials in URL, non-HTTPS URLs outside an explicit development flag, and redirects. Test an allowed HTTPS URL forwards `Authorization: Bearer <key>` and model/messages once. Capture logger output and assert it excludes key, authorization, request body, response body, and upstream query values.

- [ ] **Step 2: Run focused API tests and verify missing Provider module failure**

Run: `npm --workspace @promptvault/api test -- --run src/modules/provider`

Expected: FAIL because the new module is missing.

- [ ] **Step 3: Implement constrained validation and DNS/IP protection**

Accept only `POST /api/provider/chat/completions` with Zod-validated `{ baseUrl, model, apiKey, messages }`. Parse the URL structurally, require an allowlisted `http:` development or `https:` production protocol, forbid username/password, resolve the hostname, and reject loopback, private, link-local, multicast, unspecified, and metadata-service ranges for IPv4 and IPv6. Use `redirect: "error"`; validate again for every explicitly handled redirect if redirect support is later added.

- [ ] **Step 4: Implement forwarding and redacted errors**

Build `${normalizedBaseUrl}/chat/completions`, set authorization only upstream, apply a configurable timeout, cap response size, stream or return the accepted JSON response, and map failures to `PROVIDER_TIMEOUT`, `PROVIDER_REJECTED`, or `PROVIDER_UNAVAILABLE`. Fastify serializers expose no raw upstream body on errors.

- [ ] **Step 5: Remove all user-data routes from app composition**

`app.ts` registers `@fastify/static`, health, and Provider routes during this stage. Static delivery serves `apps/web/dist`, uses the SPA entry point only for non-API browser routes, and never masks an unknown `/api/*` route with HTML. Keep legacy modules in source until Task 12, but do not import Prisma, settings credential stores, assets, Prompt, knowledge, compiler, export, import, or integrity routes. Add `@fastify/static`, bind `server.ts` to `HOST` defaulting to `0.0.0.0`, and use `PORT` defaulting to `3000`.

- [ ] **Step 6: Run security and app tests**

Run: `npm --workspace @promptvault/api test -- --run src/modules/provider src/app.test.ts`

Expected: PASS; only `/health` and `/api/provider/chat/completions` exist.

- [ ] **Step 7: Commit**

```powershell
git add apps/api
git commit -m "feat: reduce API to a stateless Provider proxy"
```

---

### Task 11: Apply the Approved Responsive MT-Prompt Workbench

**Files:**
- Modify: `apps/web/src/app/AppShell.tsx`
- Modify: `apps/web/src/app/router.tsx`
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/src/main.tsx`
- Create: `apps/web/src/app/AppShell.test.tsx`
- Modify: `tests/e2e/prompt-library.spec.ts`
- Modify: `tests/e2e/generator.spec.ts`
- Create: `tests/e2e/responsive.spec.ts`

- [ ] **Step 1: Write failing navigation and viewport tests**

Component assertions: brand reads `MT-Prompt`, four routes have accessible names, desktop text navigation exists, and active state follows the route.

Playwright assertions at 1440脳900, 1024脳768, and 390脳844: full sidebar at desktop, icon sidebar at tablet, bottom navigation at mobile; no horizontal document overflow; library rows, generator panes, editors, and dialogs remain within viewport bounds.

- [ ] **Step 2: Run tests and verify current shell fails the new brand/layout assertions**

Run: `npm --workspace @promptvault/web test -- --run src/app/AppShell.test.tsx`

Expected: FAIL on `PromptVault` brand and missing mobile navigation.

- [ ] **Step 3: Implement the B-direction shell and stable dimensions**

Use the supplied Logo SVG in the brand. Desktop sidebar width is 176 px; tablet rail is 64 px; mobile bottom bar is 60 px plus safe-area inset. Main content uses `minmax(0, 1fr)`, bounded page padding, and stable button/icon dimensions. Use Lucide `Archive`, `Sparkles`, `BookOpen`, and `Settings`; add native or accessible CSS tooltips on the tablet rail.

- [ ] **Step 4: Apply restrained visual tokens and responsive feature layouts**

Define neutral surfaces, dark green navigation, lime accent used sparingly, 6 px or smaller control/card radii, nonnegative letter spacing of `0`, and no viewport-scaled fonts. At mobile sizes, make drawers/editors full screen, list content single-column, and generator content stacked. Prevent header actions and titles from overlapping through wrapping and `min-width: 0`.

- [ ] **Step 5: Run component and E2E responsive tests**

Run: `npm --workspace @promptvault/web test -- --run`

Expected: all web tests PASS.

Run: `npm run test:e2e -- tests/e2e/responsive.spec.ts tests/e2e/prompt-library.spec.ts tests/e2e/generator.spec.ts`

Expected: PASS at desktop, tablet, and mobile projects/viewports with no overlap or horizontal overflow.

- [ ] **Step 6: Capture and inspect browser screenshots**

Use the in-app Browser first. Capture library, generator, knowledge, and settings at 1440脳900 and 390脳844. Inspect that the Logo renders, navigation changes modes, text is not clipped, dialogs stay in bounds, and no empty/blank content appears. Record screenshots in Playwright output only; do not commit them.

- [ ] **Step 7: Commit**

```powershell
git add apps/web/src/app apps/web/src/styles.css apps/web/src/main.tsx tests/e2e
git commit -m "feat: apply the responsive MT-Prompt workbench"
```

---

### Task 12: Add Minimal Docker Deployment, Complete Migration Verification, and Retire Production SQLite

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `docker-compose.yml`
- Create: `scripts/check-production-boundary.ts`
- Create: `scripts/check-production-boundary.test.ts`
- Modify: `package.json`
- Modify: `apps/api/package.json`
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/database.md`
- Modify: `.env.example`
- Delete after acceptance: obsolete imports under `apps/api/src/modules/assets`, `compiler`, `export`, `knowledge`, `prompts`, and `settings`
- Delete after acceptance: `apps/api/src/plugins/prisma.ts`
- Retain for migration/history: `prisma/`, `database/`, `storage/`, and `data/imports/ciyuan01/` until the user separately approves archival/removal

- [ ] **Step 1: Write the failing production-boundary test**

```ts
it("contains no server user-data runtime dependencies", async () => {
  const report = await inspectProductionBoundary(projectRoot);
  expect(report.forbiddenDependencies).toEqual([]);
  expect(report.requiredDataVolumes).toEqual([]);
  expect(report.registeredRoutes.sort()).toEqual(["/api/provider/chat/completions", "/health"]);
});
```

- [ ] **Step 2: Run the test and verify current Prisma/runtime references fail**

Run: `npx vitest run scripts/check-production-boundary.test.ts`

Expected: FAIL listing Prisma, server user-data routes, and runtime directories.

- [ ] **Step 3: Add multi-stage Docker build and LAN compose file**

Builder stage runs `npm ci`, web/API typecheck/tests as a separate CI step, and production builds. Runtime stage uses a pinned slim Node image, copies only API dist, web dist, and production dependencies, runs as a non-root user, exposes `3000`, and starts the minimal server. Compose maps `${MT_PROMPT_PORT:-3000}:3000`, sets `HOST=0.0.0.0`, and declares no volume.

- [ ] **Step 4: Run legacy conversion against the real selected ten Prompts without modifying sources**

Run the migration CLI with the exact ten legacy Prompt IDs resolved by title, output to `exports/mt-prompt-ten-examples.prompt`, validate it, import into a clean browser Vault, and compare:

- exactly ten Prompt titles;
- Chinese and English content;
- all referenced media byte sizes and SHA-256 values;
- provenance template/Skill snapshots;
- zero Provider values.

Keep `database/promptvault.db`, `storage/`, and the generated conversion report unchanged and recoverable. Do not commit runtime data or the generated `.prompt` file.

- [ ] **Step 5: Remove obsolete production modules and dependencies**

After Step 4 passes, delete obsolete API route/service modules and Prisma plugin imports. Remove `@prisma/client`, multipart, Windows credential code, and server export dependencies from the production API package. Preserve Prisma scripts and legacy source directories as migration/history material unless the user separately authorizes archival.

- [ ] **Step 6: Update Chinese-first documentation**

README must describe MT-Prompt, Docker/LAN startup, independent browser Vaults, lack of automatic sync, `.prompt` optional settings/knowledge, permanent Provider exclusion, browser-profile key security, and migration recovery. Architecture/database docs must state IndexedDB ownership and that Docker volumes are unnecessary. `.env.example` contains only nonsensitive host, port, proxy timeout, response size, and optional development HTTP-upstream flags.

- [ ] **Step 7: Run the complete verification suite**

Run:

```powershell
npm test
npm run typecheck
npm run test:e2e
npm run build --workspaces --if-present
npx vitest run scripts/check-production-boundary.test.ts
docker build -t mt-prompt:local .
docker compose up -d
```

Expected: all tests/typechecks/builds PASS; boundary report has no forbidden production dependency; image builds successfully; `Invoke-RestMethod http://127.0.0.1:3000/health` returns healthy status.

- [ ] **Step 8: Verify LAN persistence, isolation, logs, and image contents**

From two browser profiles or LAN devices, create different Prompts and confirm neither sees the other. Recreate the container and confirm both browser Vaults remain. Exercise a Provider request with a disposable test key, then inspect logs and the container filesystem for that key, Provider body, SQLite files, asset uploads, and export files; all searches must return no matches. Record compressed web asset size and `docker image inspect mt-prompt:local --format '{{.Size}}'` in the release verification notes.

- [ ] **Step 9: Stop the verification container and commit**

```powershell
docker compose down
git add Dockerfile .dockerignore docker-compose.yml scripts package.json package-lock.json apps/api README.md docs .env.example
git commit -m "feat: ship lightweight MT-Prompt Docker runtime"
```

---

## Final Acceptance Checklist

- [ ] The UI and metadata consistently say MT-Prompt and use the supplied Logo.
- [ ] A new browser initializes exactly the approved ten examples once.
- [ ] Prompt, media, versions, knowledge, and settings persist only in that browser's IndexedDB.
- [ ] `.prompt` exports selected Prompt/media and optionally allowlisted settings/full knowledge.
- [ ] `.prompt` never contains Provider base URL, model, key, or equivalent aliases.
- [ ] Imports preview first, apply atomically, and never overwrite local Prompt or built-in knowledge.
- [ ] Local Prompt workflows do not require Provider or API availability.
- [ ] Provider requests are stateless, constrained, redacted, timeout-bounded, and protected from internal-network targets.
- [ ] Desktop, tablet, and mobile layouts match the approved B-direction and have no overlap or overflow.
- [ ] Docker binds for LAN use, requires no data volume, and creates no user-data files.
- [ ] Legacy SQLite/storage data remain recoverable through migration verification.
- [ ] All tests, typechecks, browser checks, Docker checks, and bundle/image size reports pass.

