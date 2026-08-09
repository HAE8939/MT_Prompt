# PromptVault V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable local-first PromptVault V1 with Prompt and image asset management, bilingual knowledge assets, a deterministic Prompt Compiler, OpenAI/Microsoft translation adapters, export, and end-to-end verification.

**Architecture:** Use an npm Workspaces monorepo with a React/Vite web app, a Fastify API, shared Zod contracts, and a pure TypeScript compiler package. Prisma/SQLite stores structured data; a storage adapter owns binary assets; API credentials stay behind a credential-service interface.

**Tech Stack:** Node.js 22+, npm Workspaces, React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router, TanStack Query, Fastify, Zod, Prisma, SQLite, Vitest, Testing Library, Playwright.

---

## File Map

```text
apps/web/src/
  app/                    Router, providers, application shell
  features/library/       Prompt list, filters, cards, detail and editor
  features/generator/     Three-step generator and result actions
  features/knowledge/     Template, skill and personal-rule management
  features/settings/      Translation, storage and export settings
  lib/                    API client and shared browser utilities

apps/api/src/
  app.ts                  Fastify composition root
  server.ts               Process startup only
  plugins/                Prisma, storage, credentials and error handler
  modules/prompts/        Prompt service and routes
  modules/assets/         Upload validation, storage and routes
  modules/knowledge/      Models, tasks, templates, skills and rules
  modules/compiler/       Translation orchestration and compilation routes
  modules/export/         Versioned ZIP export

packages/contracts/src/  Shared Zod schemas and inferred DTO types
packages/compiler/src/   Pure validation, conflict handling and formatting
prisma/                   Schema, migrations and idempotent seed
tests/e2e/                Playwright core workflows
```

## Task 1: Bootstrap the Runnable Workspace

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/server.ts`
- Create: `apps/api/src/app.test.ts`
- Create: `apps/web/package.json`
- Create: `apps/web/index.html`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/app/App.tsx`
- Create: `packages/contracts/package.json`
- Create: `packages/compiler/package.json`

- [ ] **Step 1: Add a failing API health test**

```ts
import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

describe("GET /api/v1/health", () => {
  it("reports the service as ready", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/api/v1/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
    await app.close();
  });
});
```

- [ ] **Step 2: Install dependencies and verify the test fails**

Run: `npm install && npm --workspace @promptvault/api test -- --run`

Expected: FAIL because `buildApp` does not exist.

- [ ] **Step 3: Add the workspace scripts and minimal applications**

```json
{
  "name": "promptvault",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "concurrently -k -n api,web \"npm:dev:api\" \"npm:dev:web\"",
    "dev:api": "npm --workspace @promptvault/api run dev",
    "dev:web": "npm --workspace @promptvault/web run dev",
    "setup": "prisma generate && prisma migrate deploy && npm run seed",
    "seed": "tsx prisma/seed.ts",
    "test": "npm run test --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present"
  }
}
```

```ts
// apps/api/src/app.ts
import Fastify from "fastify";

export async function buildApp() {
  const app = Fastify({ logger: false });
  app.get("/api/v1/health", async () => ({ status: "ok" as const }));
  return app;
}
```

```tsx
// apps/web/src/app/App.tsx
export function App() {
  return <main><h1>PromptVault</h1></main>;
}
```

- [ ] **Step 4: Run the workspace checks**

Run: `npm --workspace @promptvault/api test -- --run && npm run typecheck`

Expected: PASS with one health test and zero type errors.

- [ ] **Step 5: Commit**

```powershell
git add package.json package-lock.json tsconfig.base.json apps packages
git commit -m "chore: bootstrap PromptVault workspace"
```

## Task 2: Define and Seed the Database

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `prisma/seed-data.ts`
- Create: `prisma/seed.test.ts`
- Create: `apps/api/src/plugins/prisma.ts`
- Create: `.env.example`

- [ ] **Step 1: Write a failing seed-data contract test**

```ts
import { describe, expect, it } from "vitest";
import { models, skills } from "./seed-data.js";

describe("built-in knowledge", () => {
  it("contains four models, nineteen tasks, and fifteen skills", () => {
    expect(models).toHaveLength(4);
    expect(models.flatMap((model) => model.tasks)).toHaveLength(19);
    expect(skills).toHaveLength(15);
    expect(models.every((model) => model.tasks.every((task) => task.template))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the seed test and confirm failure**

Run: `npx vitest run prisma/seed.test.ts`

Expected: FAIL because `seed-data.ts` does not exist.

- [ ] **Step 3: Implement the Prisma schema and exact seed constants**

Define Prisma models for `Prompt`, `Asset`, `Tag`, `PromptTag`, `Category`, `PromptVersion`, `Model`, `ModelTask`, `PromptTemplate`, `PromptSkill`, `SkillModelTask`, `TemplateSkill`, `PersonalRule`, `CompilationRun`, and `CompilationSkill`. Use explicit enums for Prompt status, origin, asset role, media type, and translation status. Use cascade deletion only for rows whose lifecycle is owned by the parent.

```ts
export const models = [
  { key: "gpt-image-2", name: "GPT-IMAGE 2", tasks: ["image-generate", "reference-redraw", "local-edit", "scene-preserving-edit", "canvas-expand", "style-transfer"] },
  { key: "nano-banana-2", name: "Nano Banana 2", tasks: ["character-replace", "object-replace", "image-fusion", "character-consistency", "local-enhance"] },
  { key: "kling-3", name: "Kling 3.0", tasks: ["image-to-video", "text-to-video", "camera-motion", "character-action"] },
  { key: "seedance-2", name: "Seedance 2.0", tasks: ["storyboard", "multi-shot", "narrative-video", "commercial-ad"] }
].map((model) => ({ ...model, tasks: model.tasks.map((key) => ({ key, template: `${key}-default` })) }));

export const skills = [
  "reference-lock", "pixel-level-preservation", "minimal-modification", "scene-structure-lock",
  "luxury-interior-photography", "architectural-visualization", "material-realism",
  "arri-alexa-65-look", "24mm-architectural-lens", "cinematic-depth",
  "natural-light-preservation", "golden-hour-lighting", "blue-hour-cinematic",
  "character-consistency", "no-direct-eye-contact"
];
```

- [ ] **Step 4: Generate, migrate, seed, and test**

Run: `npm run setup && npx vitest run prisma/seed.test.ts`

Expected: Prisma migration applies, seed is idempotent, and the test passes.

- [ ] **Step 5: Commit**

```powershell
git add prisma apps/api/src/plugins .env.example package.json package-lock.json
git commit -m "feat: add PromptVault data model and seed knowledge"
```

## Task 3: Add Shared Contracts and Prompt CRUD

**Files:**
- Create: `packages/contracts/src/prompts.ts`
- Create: `packages/contracts/src/errors.ts`
- Create: `packages/contracts/src/index.ts`
- Create: `apps/api/src/modules/prompts/prompt.service.ts`
- Create: `apps/api/src/modules/prompts/prompt.routes.ts`
- Create: `apps/api/src/modules/prompts/prompt.routes.test.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Write failing Prompt API tests**

```ts
it("creates and filters prompts", async () => {
  const created = await app.inject({ method: "POST", url: "/api/v1/prompts", payload: {
    title: "蓝调客厅", contentZh: "保持结构不变", type: "IMAGE_EDIT", modelTaskId
  }});
  expect(created.statusCode).toBe(201);

  const list = await app.inject({ method: "GET", url: "/api/v1/prompts?keyword=蓝调&page=1&limit=20" });
  expect(list.statusCode).toBe(200);
  expect(list.json().data).toHaveLength(1);
});
```

- [ ] **Step 2: Confirm the routes are absent**

Run: `npm --workspace @promptvault/api test -- prompt.routes.test.ts --run`

Expected: FAIL with HTTP 404.

- [ ] **Step 3: Implement Zod contracts, service transactions, and routes**

```ts
export const createPromptSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(500).optional(),
  contentZh: z.string().trim().min(1),
  contentEn: z.string().trim().optional(),
  negativeZh: z.string().trim().optional(),
  negativeEn: z.string().trim().optional(),
  modelTaskId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  tagIds: z.array(z.string().uuid()).default([]),
  rating: z.number().int().min(0).max(5).default(0),
  status: z.enum(["EXPERIMENT", "VERIFIED", "FAVORITE"]).default("EXPERIMENT")
});
```

Implement `GET`, `POST`, `GET /:id`, `PATCH /:id`, `DELETE /:id`, and version endpoints. Wrap Prompt updates, tag replacement, and version snapshots in a Prisma transaction.

- [ ] **Step 4: Run API and type tests**

Run: `npm --workspace @promptvault/api test -- prompt.routes.test.ts --run && npm run typecheck`

Expected: PASS for create, list, filter, update, version, and delete cases.

- [ ] **Step 5: Commit**

```powershell
git add packages/contracts apps/api/src/modules/prompts apps/api/src/app.ts
git commit -m "feat: add prompt contracts and CRUD API"
```

## Task 4: Implement Local Asset Storage

**Files:**
- Create: `apps/api/src/modules/assets/storage-adapter.ts`
- Create: `apps/api/src/modules/assets/local-storage-adapter.ts`
- Create: `apps/api/src/modules/assets/asset.service.ts`
- Create: `apps/api/src/modules/assets/asset.routes.ts`
- Create: `apps/api/src/modules/assets/asset.service.test.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Write a failing compensation test**

```ts
it("removes a stored file when asset persistence fails", async () => {
  const storage = new FakeStorage();
  const repository = { create: vi.fn().mockRejectedValue(new Error("db failed")) };
  const service = new AssetService(storage, repository);

  await expect(service.upload(validPng, { promptId, role: "COVER" })).rejects.toThrow("db failed");
  expect(storage.removedKeys).toEqual([storage.writtenKeys[0]]);
});
```

- [ ] **Step 2: Confirm the asset service is missing**

Run: `npm --workspace @promptvault/api test -- asset.service.test.ts --run`

Expected: FAIL because `AssetService` is undefined.

- [ ] **Step 3: Implement validation, atomic writes, and HTTP routes**

```ts
export interface StorageAdapter {
  put(input: { stream: NodeJS.ReadableStream; extension: string; role: AssetRole }): Promise<{ key: string; size: number; checksum: string }>;
  remove(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  createReadStream(key: string): Promise<NodeJS.ReadableStream>;
}
```

Accept PNG, JPEG, WebP, and AVIF up to 25 MB. Decode metadata before persistence. Serve files through an authenticated-ready API route rather than exposing arbitrary filesystem paths.

- [ ] **Step 4: Run asset tests**

Run: `npm --workspace @promptvault/api test -- asset.service.test.ts --run`

Expected: PASS for valid upload, invalid MIME, oversized file, compensation, streaming, and cleanup queue cases.

- [ ] **Step 5: Commit**

```powershell
git add apps/api/src/modules/assets apps/api/src/app.ts
git commit -m "feat: add local image asset storage"
```

## Task 5: Build the Knowledge APIs

**Files:**
- Create: `packages/contracts/src/knowledge.ts`
- Create: `apps/api/src/modules/knowledge/knowledge.service.ts`
- Create: `apps/api/src/modules/knowledge/knowledge.routes.ts`
- Create: `apps/api/src/modules/knowledge/knowledge.routes.test.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Write failing compatibility tests**

```ts
it("returns only skills compatible with the selected task", async () => {
  const response = await app.inject({ method: "GET", url: `/api/v1/skills?modelTaskId=${imageEditTaskId}` });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.every((skill: { modelTaskIds: string[] }) => skill.modelTaskIds.includes(imageEditTaskId))).toBe(true);
});
```

- [ ] **Step 2: Confirm failure**

Run: `npm --workspace @promptvault/api test -- knowledge.routes.test.ts --run`

Expected: FAIL with HTTP 404.

- [ ] **Step 3: Implement catalog and knowledge CRUD**

Add read routes for models, model tasks, tags, and categories. Add versioned CRUD for templates, skills, and personal rules. Built-in records are copied before user editing; seed upgrades never overwrite user-owned rows.

```ts
export const skillInputSchema = z.object({
  nameZh: z.string().min(1), nameEn: z.string().min(1),
  descriptionZh: z.string().default(""), descriptionEn: z.string().default(""),
  contentZh: z.string().min(1), contentEn: z.string().min(1),
  category: z.string().min(1), priority: z.number().int().min(0).max(1000),
  conflictGroup: z.string().nullable(), modelTaskIds: z.array(z.string().uuid()).min(1),
  enabled: z.boolean().default(true)
});
```

- [ ] **Step 4: Run knowledge tests**

Run: `npm --workspace @promptvault/api test -- knowledge.routes.test.ts --run`

Expected: PASS for compatibility, create-copy behavior, versioning, enable/disable, and built-in protection.

- [ ] **Step 5: Commit**

```powershell
git add packages/contracts apps/api/src/modules/knowledge apps/api/src/app.ts
git commit -m "feat: add model and prompt knowledge APIs"
```

## Task 6: Implement the Pure Bilingual Compiler

**Files:**
- Create: `packages/compiler/src/types.ts`
- Create: `packages/compiler/src/conflicts.ts`
- Create: `packages/compiler/src/compile.ts`
- Create: `packages/compiler/src/format.ts`
- Create: `packages/compiler/src/index.ts`
- Create: `packages/compiler/src/compile.test.ts`

- [ ] **Step 1: Write failing deterministic compilation tests**

```ts
it("compiles localized sections in stable priority order", () => {
  const result = compilePrompt(fixture);
  expect(result.contentZh).toBe("使用参考图。\n\n保持空间结构。\n\n仅修改光线。");
  expect(result.contentEn).toBe("Use the reference image.\n\nPreserve the spatial structure.\n\nModify lighting only.");
});

it("rejects two skills from one conflict group", () => {
  expect(() => compilePrompt(conflictingFixture)).toThrowError(CompilerConflictError);
});
```

- [ ] **Step 2: Verify failures**

Run: `npm --workspace @promptvault/compiler test -- --run`

Expected: FAIL because `compilePrompt` does not exist.

- [ ] **Step 3: Implement pure validation, ordering, and formatting**

```ts
export function compilePrompt(input: CompileInput): CompileResult {
  assertCompatible(input);
  assertNoConflicts(input.skills);
  const sections = buildSections(input).sort((a, b) => b.priority - a.priority || a.order - b.order);
  return {
    contentZh: formatSections(sections.map((section) => section.contentZh)),
    contentEn: formatSections(sections.map((section) => section.contentEn)),
    warnings: [],
    metadata: createMetadata(input)
  };
}
```

- [ ] **Step 4: Run compiler tests twice**

Run: `npm --workspace @promptvault/compiler test -- --run && npm --workspace @promptvault/compiler test -- --run`

Expected: Both runs pass with byte-identical snapshots.

- [ ] **Step 5: Commit**

```powershell
git add packages/compiler
git commit -m "feat: add deterministic bilingual prompt compiler"
```

## Task 7: Orchestrate Translation and Compilation

**Files:**
- Create: `packages/contracts/src/compiler.ts`
- Create: `apps/api/src/modules/compiler/translation-provider.ts`
- Create: `apps/api/src/modules/compiler/openai-translation-provider.ts`
- Create: `apps/api/src/modules/compiler/microsoft-translation-provider.ts`
- Create: `apps/api/src/modules/compiler/compiler.service.ts`
- Create: `apps/api/src/modules/compiler/compiler.routes.ts`
- Create: `apps/api/src/modules/compiler/compiler.service.test.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Write failing translation failure and retry tests**

```ts
it("persists Chinese output when translation fails", async () => {
  translator.translate.mockRejectedValue(new TranslationError("RATE_LIMITED"));
  const run = await service.compile(request);
  expect(run.contentZh).toContain("保持空间结构");
  expect(run.contentEn).toBeNull();
  expect(run.translationStatus).toBe("FAILED");
});
```

- [ ] **Step 2: Verify failure**

Run: `npm --workspace @promptvault/api test -- compiler.service.test.ts --run`

Expected: FAIL because compiler orchestration is absent.

- [ ] **Step 3: Implement provider adapters and orchestration**

Translate only non-empty dynamic template values. Map provider errors to `NOT_CONFIGURED`, `INVALID_CREDENTIALS`, `RATE_LIMITED`, `TIMEOUT`, or `UNAVAILABLE`. Persist the Chinese result and failed translation status in the same transaction; retry updates only English fields and translation metadata.

```ts
export interface TranslationProvider {
  readonly id: "openai" | "microsoft";
  translate(values: Record<string, string>, signal: AbortSignal): Promise<Record<string, string>>;
}
```

- [ ] **Step 4: Run orchestration tests**

Run: `npm --workspace @promptvault/api test -- compiler.service.test.ts --run`

Expected: PASS for success, no-provider, rate limit, timeout, retry, provider switch, and provenance cases.

- [ ] **Step 5: Commit**

```powershell
git add packages/contracts apps/api/src/modules/compiler apps/api/src/app.ts
git commit -m "feat: orchestrate translation and prompt compilation"
```

## Task 8: Build the Workbench Shell and Prompt Library

**Files:**
- Create: `apps/web/src/styles.css`
- Create: `apps/web/src/app/router.tsx`
- Create: `apps/web/src/app/AppShell.tsx`
- Create: `apps/web/src/lib/api-client.ts`
- Create: `apps/web/src/features/library/LibraryPage.tsx`
- Create: `apps/web/src/features/library/PromptCard.tsx`
- Create: `apps/web/src/features/library/PromptFilters.tsx`
- Create: `apps/web/src/features/library/PromptDetailPage.tsx`
- Create: `apps/web/src/features/library/PromptEditor.tsx`
- Create: `apps/web/src/features/library/LibraryPage.test.tsx`
- Modify: `apps/web/src/main.tsx`

- [ ] **Step 1: Write a failing library interaction test**

```tsx
it("filters the library and opens Prompt detail", async () => {
  renderWithApp(<LibraryPage />);
  await user.type(screen.getByRole("searchbox"), "客厅");
  expect(await screen.findByText("现代东方豪宅客厅")).toBeVisible();
  await user.click(screen.getByText("现代东方豪宅客厅"));
  expect(await screen.findByRole("heading", { name: "现代东方豪宅客厅" })).toBeVisible();
});
```

- [ ] **Step 2: Confirm UI test failure**

Run: `npm --workspace @promptvault/web test -- LibraryPage.test.tsx --run`

Expected: FAIL because the library components do not exist.

- [ ] **Step 3: Implement the professional workbench UI**

Use a dark-gray surface system, restrained purple focus color, 6px card radii, Lucide icons, stable grid tracks, and visible keyboard focus. Desktop opens details in a docked panel; narrow viewports navigate to the full detail route. Include loading skeletons, empty states, error states, search debounce, filters, grid/list toggle, CRUD forms, version history, copy actions, and asset gallery.

```tsx
export function PromptCard({ prompt }: { prompt: PromptListItem }) {
  return <article className="group overflow-hidden rounded-md border border-border bg-card">
    <PromptCover asset={prompt.cover} />
    <div className="p-3"><h3 className="text-sm font-medium">{prompt.title}</h3><PromptMeta prompt={prompt} /></div>
  </article>;
}
```

- [ ] **Step 4: Run frontend tests and typecheck**

Run: `npm --workspace @promptvault/web test -- --run && npm run typecheck`

Expected: PASS for library loading, filtering, detail navigation, create/edit validation, copying, and deletion confirmation.

- [ ] **Step 5: Commit**

```powershell
git add apps/web
git commit -m "feat: build Prompt library workbench"
```

## Task 9: Build Generator, Knowledge, and Settings UIs

**Files:**
- Create: `apps/web/src/features/generator/GeneratorPage.tsx`
- Create: `apps/web/src/features/generator/GeneratorStepper.tsx`
- Create: `apps/web/src/features/generator/DynamicTemplateForm.tsx`
- Create: `apps/web/src/features/generator/SkillPicker.tsx`
- Create: `apps/web/src/features/generator/GeneratorResult.tsx`
- Create: `apps/web/src/features/generator/GeneratorPage.test.tsx`
- Create: `apps/web/src/features/knowledge/KnowledgePage.tsx`
- Create: `apps/web/src/features/knowledge/KnowledgeEditor.tsx`
- Create: `apps/web/src/features/settings/SettingsPage.tsx`
- Modify: `apps/web/src/app/router.tsx`

- [ ] **Step 1: Write a failing three-step generator test**

```tsx
it("generates and saves a bilingual Prompt", async () => {
  renderWithApp(<GeneratorPage />);
  await user.selectOptions(screen.getByLabelText("模型"), "gpt-image-2");
  await user.selectOptions(screen.getByLabelText("任务"), "scene-preserving-edit");
  await user.type(screen.getByLabelText("修改内容"), "把白天改成蓝调夜景");
  await user.click(screen.getByRole("button", { name: "生成 Prompt" }));
  expect(await screen.findByText("中文 Prompt")).toBeVisible();
  expect(await screen.findByText("English Prompt")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "保存到 Prompt 库" }));
  expect(await screen.findByText("已保存到 Prompt 库")).toBeVisible();
});
```

- [ ] **Step 2: Confirm failure**

Run: `npm --workspace @promptvault/web test -- GeneratorPage.test.tsx --run`

Expected: FAIL because Generator pages are absent.

- [ ] **Step 3: Implement complete controls and states**

The Generator resets incompatible downstream selections after confirmation, renders fields from template JSON schema, filters skills by task, blocks conflict groups, displays active personal rules, and separates Chinese and English result panels. Knowledge editors cover bilingual content, compatibility, priorities, conflict groups, enablement, and versions. Settings verifies provider credentials without returning secrets and exposes storage health and export.

- [ ] **Step 4: Run all frontend tests**

Run: `npm --workspace @promptvault/web test -- --run && npm run typecheck`

Expected: PASS for generator success/failure/retry, conflicts, knowledge CRUD, provider verification, and export actions.

- [ ] **Step 5: Commit**

```powershell
git add apps/web
git commit -m "feat: add generator knowledge and settings workflows"
```

## Task 10: Add Credential Storage and Complete Export

**Files:**
- Create: `apps/api/src/modules/settings/credential-store.ts`
- Create: `apps/api/src/modules/settings/windows-credential-store.ts`
- Create: `apps/api/src/modules/settings/settings.routes.ts`
- Create: `apps/api/src/modules/settings/settings.routes.test.ts`
- Create: `apps/api/src/modules/export/export.service.ts`
- Create: `apps/api/src/modules/export/export.routes.ts`
- Create: `apps/api/src/modules/export/export.service.test.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Write failing secret and archive tests**

```ts
it("never returns the stored API key", async () => {
  await app.inject({ method: "PUT", url: "/api/v1/settings/translation-provider", payload: { provider: "openai", apiKey: "secret" } });
  const status = await app.inject({ method: "GET", url: "/api/v1/settings/status" });
  expect(JSON.stringify(status.json())).not.toContain("secret");
});

it("exports a versioned manifest, records, and assets", async () => {
  const archive = await service.createExport();
  expect(await archive.entries()).toEqual(expect.arrayContaining(["manifest.json", "prompts.json", "knowledge.json"]));
});
```

- [ ] **Step 2: Confirm failures**

Run: `npm --workspace @promptvault/api test -- settings.routes.test.ts export.service.test.ts --run`

Expected: FAIL because settings and export services do not exist.

- [ ] **Step 3: Implement Windows credentials and atomic ZIP export**

Use the Windows Credential Manager-backed implementation behind `CredentialStore`; tests use an in-memory implementation. Build archives in `exports/.tmp`, include checksums and schema version in `manifest.json`, then atomically rename completed ZIP files.

```ts
export interface CredentialStore {
  set(service: string, secret: string): Promise<void>;
  get(service: string): Promise<string | null>;
  remove(service: string): Promise<void>;
}
```

- [ ] **Step 4: Run settings and export tests**

Run: `npm --workspace @promptvault/api test -- settings.routes.test.ts export.service.test.ts --run`

Expected: PASS and no response or log snapshot contains test secrets.

- [ ] **Step 5: Commit**

```powershell
git add apps/api/src/modules/settings apps/api/src/modules/export apps/api/src/app.ts
git commit -m "feat: secure translation settings and data export"
```

## Task 11: Verify the Product End to End

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/prompt-library.spec.ts`
- Create: `tests/e2e/assets.spec.ts`
- Create: `tests/e2e/generator.spec.ts`
- Create: `tests/e2e/provenance.spec.ts`
- Create: `README.md`
- Create: `docs/architecture.md`
- Create: `docs/database.md`
- Create: `docs/prompt-engine.md`
- Create: `docs/changelog.md`

- [ ] **Step 1: Write the four acceptance workflows**

```ts
test("generate, save, and inspect provenance", async ({ page }) => {
  await page.goto("/generator");
  await page.getByLabel("模型").selectOption("gpt-image-2");
  await page.getByLabel("任务").selectOption("scene-preserving-edit");
  await page.getByLabel("修改内容").fill("把白天改成蓝调夜景");
  await page.getByRole("button", { name: "生成 Prompt" }).click();
  await expect(page.getByText("中文 Prompt")).toBeVisible();
  await page.getByRole("button", { name: "保存到 Prompt 库" }).click();
  await expect(page.getByText("生成来源")).toBeVisible();
});
```

Add equivalent tests for Prompt create/reopen, reference/result image upload, and bilingual translation retry.

- [ ] **Step 2: Run acceptance tests and record initial failures**

Run: `npx playwright test`

Expected: Any wiring or accessibility gaps are reported against the running local application.

- [ ] **Step 3: Fix only observed acceptance gaps and document operation**

README must document prerequisites, `npm install`, `npm run setup`, `npm run dev`, local URLs, credential setup, export location, tests, and the directories intentionally excluded from Git. Architecture docs must reflect actual code rather than restating planned code.

- [ ] **Step 4: Run full verification**

Run: `npm run typecheck && npm test && npx playwright test && git diff --check`

Expected: All commands exit 0. Capture desktop and narrow screenshots and confirm nonblank content, no overlap, complete navigation, and rendered image assets.

- [ ] **Step 5: Commit**

```powershell
git add playwright.config.ts tests README.md docs apps packages prisma
git commit -m "test: verify PromptVault V1 workflows"
```
