# MT-Prompt Complete UI Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the full V1 browser generator and knowledge catalog while fixing the library detail, full-width knowledge/settings layouts, and live interface preferences.

**Architecture:** Keep IndexedDB and the existing repositories as the persistence boundary. Add a typed browser catalog derived from the authoritative V1 seed, version its migration, and introduce one application-level interface settings provider so pages consume saved preferences immediately.

**Tech Stack:** React 19, TypeScript, IndexedDB, Vite, Vitest, Testing Library, Playwright, Lucide React.

---

### Task 1: Port the Complete V1 Browser Catalog

**Files:**
- Create: `apps/web/src/vault/built-in-catalog.ts`
- Create: `apps/web/src/vault/built-in-catalog.test.ts`
- Modify: `apps/web/src/domain/types.ts`
- Modify: `apps/web/src/vault/built-in-knowledge.ts`
- Modify: `apps/web/src/vault/initialize-vault.ts`
- Modify: `apps/web/src/vault/initialize-vault.test.ts`

- [ ] **Step 1: Add catalog count and relationship tests**

Test the wished-for exports directly:

```ts
expect(BUILT_IN_MODELS).toHaveLength(4);
expect(BUILT_IN_TASKS).toHaveLength(19);
expect(BUILT_IN_TEMPLATES).toHaveLength(19);
expect(BUILT_IN_SKILLS).toHaveLength(15);
expect(BUILT_IN_TASKS.every((task) => BUILT_IN_MODELS.some((model) => model.stableKey === task.modelKey))).toBe(true);
expect(BUILT_IN_TEMPLATES.every((template) => BUILT_IN_TASKS.some((task) => task.stableKey === template.taskKey))).toBe(true);
```

- [ ] **Step 2: Run the catalog tests and verify RED**

Run: `npm --workspace @promptvault/web test -- --run src/vault/built-in-catalog.test.ts`

Expected: FAIL because `built-in-catalog.ts` and catalog types do not exist.

- [ ] **Step 3: Add typed model/task/template/Skill metadata**

Define `ModelProfile`, `ModelTask`, and optional `modelKeys`, `taskKey`, `fieldSchema`, and `conflictGroup` metadata on browser knowledge records. Port the four models, nineteen tasks/templates, and fifteen Skills from `prisma/seed-data.ts` without importing Prisma at runtime.

- [ ] **Step 4: Add migration preservation tests**

Prove a clean Vault receives the complete catalog, a disabled built-in Skill stays disabled during upgrade, and a user-owned record with a matching name is not overwritten.

- [ ] **Step 5: Run migration tests and verify RED**

Run: `npm --workspace @promptvault/web test -- --run src/vault/initialize-vault.test.ts`

Expected: FAIL because the knowledge set version and merge behavior still load the partial catalog.

- [ ] **Step 6: Implement the versioned migration**

Increase `KNOWLEDGE_SET_VERSION`, insert missing stable keys, refresh untouched built-in content, and preserve stored `enabled` values plus every user-owned record.

- [ ] **Step 7: Verify Task 1**

Run: `npm --workspace @promptvault/web test -- --run src/vault/built-in-catalog.test.ts src/vault/initialize-vault.test.ts`

Expected: PASS with 4 models, 19 tasks, 19 templates, and 15 Skills.

### Task 2: Apply Interface Settings at Application Scope

**Files:**
- Create: `apps/web/src/settings/InterfaceSettingsProvider.tsx`
- Create: `apps/web/src/settings/InterfaceSettingsProvider.test.tsx`
- Modify: `apps/web/src/app/App.tsx`
- Modify: `apps/web/src/features/settings/SettingsPage.tsx`
- Modify: `apps/web/src/features/settings/SettingsPage.test.tsx`
- Modify: `apps/web/src/features/library/LibraryPage.tsx`
- Modify: `apps/web/src/styles.css`

- [ ] **Step 1: Add failing runtime preference tests**

Render the provider and assert that selecting dark theme sets `document.documentElement.dataset.theme` to `dark`, compact mode sets `dataset.density` to `compact`, and saved grid view initializes the library grid.

- [ ] **Step 2: Verify RED**

Run: `npm --workspace @promptvault/web test -- --run src/settings/InterfaceSettingsProvider.test.tsx src/features/settings/SettingsPage.test.tsx src/features/library/LibraryPage.test.tsx`

Expected: FAIL because settings are persisted but not consumed by the application.

- [ ] **Step 3: Implement the settings provider**

Expose `{ settings, updateSettings, ready, error }`, load through `settings.getInterface()`, persist through `settings.saveInterface()`, observe `prefers-color-scheme` for system theme, and update root theme/density attributes immediately.

- [ ] **Step 4: Connect settings and library**

Wrap the router in `InterfaceSettingsProvider`; replace page-local settings persistence with the provider; initialize and persist library list/grid selection through the same context.

- [ ] **Step 5: Add theme and density tokens**

Define light/dark semantic variables under root theme selectors and compact spacing overrides under `[data-density="compact"]` without changing layout dimensions unpredictably.

- [ ] **Step 6: Verify Task 2**

Run: `npm --workspace @promptvault/web test -- --run src/settings/InterfaceSettingsProvider.test.tsx src/features/settings/SettingsPage.test.tsx src/features/library/LibraryPage.test.tsx`

Expected: PASS, including reload persistence.

### Task 3: Fix Library Actions and Prompt Detail

**Files:**
- Modify: `apps/web/src/features/library/LibraryPage.tsx`
- Modify: `apps/web/src/features/library/library-fixes.css`
- Modify: `apps/web/src/features/library/LibraryPage.test.tsx`
- Modify: `tests/e2e/prompt-library.spec.ts`

- [ ] **Step 1: Add failing detail interaction tests**

Assert both Prompt blocks expose named copy buttons, successful copy changes the corresponding label, clipboard rejection renders an alert, the cover uses the non-cropping detail class, and clicking it opens a dialog containing the full media.

- [ ] **Step 2: Verify RED**

Run: `npm --workspace @promptvault/web test -- --run src/features/library/LibraryPage.test.tsx`

Expected: FAIL because detail copy and media viewer are absent.

- [ ] **Step 3: Implement detail copy and media viewer**

Use Lucide `Clipboard`, `Check`, and `Maximize2` actions; keep copy state per language; catch clipboard failures; render the main image with `object-fit: contain`; open a full-viewport accessible viewer that closes by button or Escape.

- [ ] **Step 4: Normalize the library action group**

Give label and button controls the same inline-flex box, icon alignment, height, focus ring, and responsive flex behavior. Keep the file input visually hidden but keyboard accessible.

- [ ] **Step 5: Verify Task 3**

Run: `npm --workspace @promptvault/web test -- --run src/features/library/LibraryPage.test.tsx`

Expected: PASS with no accessibility query failures.

### Task 4: Restore the Full Generator Workflow

**Files:**
- Modify: `apps/web/src/features/generator/GeneratorPage.tsx`
- Modify: `apps/web/src/features/generator/browser-compiler.ts`
- Modify: `apps/web/src/features/generator/generator.css`
- Modify: `apps/web/src/features/generator/GeneratorPage.test.tsx`
- Modify: `apps/web/src/features/generator/browser-compiler.test.ts`
- Modify: `tests/e2e/generator.spec.ts`

- [ ] **Step 1: Add failing cascading-selection tests**

Assert the generator exposes model, task, and template selectors; GPT-IMAGE 2 only shows its tasks; changing to Kling 3.0 removes incompatible image Skills; and compilation provenance records the selected task template and Skills.

- [ ] **Step 2: Verify RED**

Run: `npm --workspace @promptvault/web test -- --run src/features/generator/GeneratorPage.test.tsx src/features/generator/browser-compiler.test.ts`

Expected: FAIL because the current generator has only template and Skill controls.

- [ ] **Step 3: Implement model/task/template selection**

Load the typed catalog, derive compatible tasks/templates/Skills, reset invalid selections on parent changes, render field-schema inputs, and pass the selected records to deterministic compilation.

- [ ] **Step 4: Add Provider enhancement failure test**

Configure a Provider, compile locally, reject the enhancement request, and assert the local bilingual result remains visible with a recoverable error.

- [ ] **Step 5: Implement explicit Provider enhancement**

Show the action only after local output exists and Provider settings are complete. Send the current result through the existing provider client, replace output only on success, and retain local output on any error.

- [ ] **Step 6: Restore responsive generator layout**

Keep a bounded configuration column and flexible results on desktop; group Skills by category; stack all controls below 800px; prevent long template names or prompts from widening the page.

- [ ] **Step 7: Verify Task 4**

Run: `npm --workspace @promptvault/web test -- --run src/features/generator/GeneratorPage.test.tsx src/features/generator/browser-compiler.test.ts`

Expected: PASS for cascading selection, local compilation, Provider failure preservation, copy, and save.

### Task 5: Rebuild Knowledge and Settings as Full-Width Workbenches

**Files:**
- Modify: `apps/web/src/features/knowledge/KnowledgePage.tsx`
- Modify: `apps/web/src/features/knowledge/knowledge.css`
- Modify: `apps/web/src/features/knowledge/KnowledgePage.test.tsx`
- Modify: `apps/web/src/features/settings/SettingsPage.tsx`
- Modify: `apps/web/src/features/settings/settings.css`
- Modify: `apps/web/src/features/settings/SettingsPage.test.tsx`

- [ ] **Step 1: Add failing knowledge coverage tests**

Assert four tabs exist (`模型与任务`, `模板`, `Skill`, `个人规则`), all four model names render in the first tab, search filters the active catalog, and built-in edit creates a user copy.

- [ ] **Step 2: Add failing settings layout tests**

Assert Provider, Interface, and Data Boundary navigation changes the active panel and that theme, default view, and compact controls invoke live settings updates.

- [ ] **Step 3: Verify RED**

Run: `npm --workspace @promptvault/web test -- --run src/features/knowledge/KnowledgePage.test.tsx src/features/settings/SettingsPage.test.tsx`

Expected: FAIL because the pages still expose the simplified tabs and fixed card stacks.

- [ ] **Step 4: Implement the knowledge workbench**

Render model/task coverage from the typed catalog and searchable template/Skill/rule lists from IndexedDB. Keep ownership, enable, edit, and copy-on-edit behaviors visible and accessible.

- [ ] **Step 5: Implement the settings workbench**

Render section navigation plus one active unframed panel; retain Provider save/test/clear; add the browser-local security boundary; bind interface controls to the application provider.

- [ ] **Step 6: Remove partial-width constraints**

Set page width to `100%`, use `minmax(0, 1fr)` tracks, cap only readable text lines and form fields, and stack navigation/toolbars at mobile breakpoints.

- [ ] **Step 7: Verify Task 5**

Run: `npm --workspace @promptvault/web test -- --run src/features/knowledge/KnowledgePage.test.tsx src/features/settings/SettingsPage.test.tsx`

Expected: PASS with the full catalog and live settings controls.

### Task 6: Full Verification and Browser QA

**Files:**
- Modify as required by verified regressions only
- Test: `tests/e2e/prompt-library.spec.ts`
- Test: `tests/e2e/generator.spec.ts`

- [ ] **Step 1: Run static and unit verification**

Run: `npm run typecheck && npm test && npm --workspace @promptvault/web run build`

Expected: all commands exit 0 with no TypeScript or test failures.

- [ ] **Step 2: Start the application**

Run: `npm run dev`

Expected: Vite and API report ready URLs and remain running for browser checks.

- [ ] **Step 3: Run focused end-to-end tests**

Run: `npm run test:e2e -- tests/e2e/prompt-library.spec.ts tests/e2e/generator.spec.ts`

Expected: PASS.

- [ ] **Step 4: Inspect desktop pages at 1440x900**

Verify `/library`, `/generator`, `/knowledge`, and `/settings`: aligned header actions, complete detail image, working copy buttons, full-width page use, full preset counts, immediate settings response, no overflow, and no console errors.

- [ ] **Step 5: Inspect mobile pages at 390x844**

Verify the same routes: bottom navigation remains unobstructed, action groups wrap, generator and settings stack, detail/viewer fit above navigation, text stays inside controls, and no horizontal scrolling occurs.

- [ ] **Step 6: Run final diff checks**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only intended application, test, and plan files are changed.
