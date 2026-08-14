# UI Recovery Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the correctness, persistence, responsive-layout, and E2E gaps found during review of the complete UI recovery branch.

**Architecture:** Keep the current browser-local Vault and deterministic compiler architecture. Fix data loss at the generator boundary, preserve catalog metadata through compilation, make interface persistence transactional from the UI's perspective, render template fields from schema, and update Playwright tests to exercise IndexedDB-owned behavior instead of removed API routes.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, IndexedDB repositories, Playwright, Vite.

---

## Scope And Order

Execute Tasks 1-5 in order because they touch shared generator/settings behavior. Task 6 updates the end-to-end release gate after the product behavior is stable. Do not change the catalog contents, Provider security boundary, transfer format, or visual design outside these fixes.

### Task 1: Preserve Bilingual Output During Provider Enhancement

**Files:**
- Modify: `apps/web/src/features/generator/GeneratorPage.tsx:157-173`
- Modify: `apps/web/src/features/generator/GeneratorPage.test.tsx`

- [ ] **Step 1: Add a successful Provider enhancement test**

Configure a Provider, generate a local bilingual result, mock `/api/provider/chat/completions` to return a JSON object containing two distinct strings, run enhancement, and assert the Chinese and English panels remain distinct. The Provider prompt must include both existing language values and request strict JSON output:

```ts
expect(requestBody.messages[0].content).toContain(localChinese);
expect(requestBody.messages[0].content).toContain(localEnglish);
expect(await screen.findByText("增强后的中文 Prompt")).toBeVisible();
expect(await screen.findByText("Enhanced English Prompt")).toBeVisible();
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm --workspace @promptvault/web test -- --run src/features/generator/GeneratorPage.test.tsx
```

Expected: FAIL because the current implementation sends only `contentZh` and assigns the same response to both fields.

- [ ] **Step 3: Implement a typed bilingual enhancement boundary**

Add a small parser in `GeneratorPage.tsx` or `provider-client.ts` that accepts only this shape:

```ts
type EnhancedPrompt = { contentZh: string; contentEn: string };

function parseEnhancedPrompt(raw: string): EnhancedPrompt {
  const value = JSON.parse(raw) as Partial<EnhancedPrompt>;
  if (!value.contentZh?.trim() || !value.contentEn?.trim()) {
    throw new Error("Provider 返回的双语 Prompt 格式无效。");
  }
  return { contentZh: value.contentZh.trim(), contentEn: value.contentEn.trim() };
}
```

Send both current outputs in the enhancement request and ask for JSON only. Update state with the two parsed values. On malformed JSON, empty fields, timeout, or Provider failure, keep the complete local result unchanged and show the recoverable error.

- [ ] **Step 4: Verify success and failure paths**

Run the focused test command again. Expected: PASS for distinct bilingual success, malformed response preservation, and existing Provider failure preservation.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/generator/GeneratorPage.tsx apps/web/src/features/generator/GeneratorPage.test.tsx
git commit -m "fix(web): preserve bilingual provider enhancement"
```

### Task 2: Restore Skill Conflict Enforcement

**Files:**
- Modify: `apps/web/src/features/generator/browser-compiler.ts:60-68`
- Modify: `apps/web/src/features/generator/browser-compiler.test.ts`
- Modify: `apps/web/src/features/generator/GeneratorPage.test.tsx`

- [ ] **Step 1: Add a compiler conflict regression test**

Compile with `natural-light-preservation` and `golden-hour-lighting`, both using `conflictGroup: "lighting"`, and assert:

```ts
expect(() => compileInBrowser(input)).toThrow(/Conflicting skills in group lighting/);
```

- [ ] **Step 2: Run focused tests and verify RED**

```bash
npm --workspace @promptvault/web test -- --run src/features/generator/browser-compiler.test.ts
```

Expected: FAIL because `browser-compiler.ts` currently replaces every conflict group with `null`.

- [ ] **Step 3: Preserve catalog metadata**

Change the Skill mapping to:

```ts
conflictGroup: record.conflictGroup ?? null,
```

Do not add a second conflict engine. Continue using `CompilerConflictError` from `@promptvault/compiler` as the single enforcement point.

- [ ] **Step 4: Add a page-level recoverable error assertion**

In `GeneratorPage.test.tsx`, select two conflicting Skills, click generation, and assert the result is not replaced and the page renders an alert that names the conflicting Skill group or asks the user to remove one conflicting Skill.

- [ ] **Step 5: Run focused tests and commit**

```bash
npm --workspace @promptvault/web test -- --run src/features/generator/browser-compiler.test.ts src/features/generator/GeneratorPage.test.tsx
git add apps/web/src/features/generator/browser-compiler.ts apps/web/src/features/generator/browser-compiler.test.ts apps/web/src/features/generator/GeneratorPage.test.tsx
git commit -m "fix(web): enforce conflicting generator skills"
```

### Task 3: Render And Compile Template Field Schemas

**Files:**
- Modify: `apps/web/src/features/generator/GeneratorPage.tsx:20-116`
- Modify: `apps/web/src/features/generator/browser-compiler.ts:13-59`
- Modify: `apps/web/src/features/generator/GeneratorPage.test.tsx`
- Modify: `apps/web/src/features/generator/browser-compiler.test.ts`

- [ ] **Step 1: Add a custom field-schema test fixture**

Create a template fixture with two fields:

```ts
fieldSchema: {
  fields: [
    { name: "requirements", labelZh: "任务要求", labelEn: "Task requirements", type: "textarea", required: true },
    { name: "cameraMotion", labelZh: "镜头运动", labelEn: "Camera motion", type: "textarea", required: true },
  ],
}
```

Assert both textareas render, generation is disabled while a required field is empty, and the generated Chinese and English output resolves both placeholders.

- [ ] **Step 2: Run generator and compiler tests and verify RED**

```bash
npm --workspace @promptvault/web test -- --run src/features/generator/GeneratorPage.test.tsx src/features/generator/browser-compiler.test.ts
```

Expected: FAIL because the page renders only the hard-coded requirement textarea and the browser compiler omits `template.fields`.

- [ ] **Step 3: Replace scalar requirement state with field-value state**

Use a record keyed by field name:

```ts
type TemplateFieldValues = Record<string, { zh: string; en: string }>;
```

Initialize values whenever the selected template changes. Render one textarea per `selectedTemplate.fieldSchema?.fields`; use `labelZh` for the visible label and accessible name. For backward compatibility, treat templates without a schema as a single required `requirements` field.

- [ ] **Step 4: Pass schema and values through the browser compiler**

Change `BrowserCompileInput` to accept `inputValues`. Pass:

```ts
fields: input.template.fieldSchema?.fields.map(({ name, required }) => ({ name, required })),
```

and forward the localized `inputValues` to `compilePrompt`. Do not silently remove unknown placeholders. Required missing values must surface `TEMPLATE_FIELD_REQUIRED` as a recoverable form alert.

- [ ] **Step 5: Verify template switching resets stale values**

Add a test that fills fields, switches task/template, and proves fields from the previous template are removed and cannot leak into compilation.

- [ ] **Step 6: Run focused tests and commit**

```bash
npm --workspace @promptvault/web test -- --run src/features/generator/GeneratorPage.test.tsx src/features/generator/browser-compiler.test.ts
git add apps/web/src/features/generator/GeneratorPage.tsx apps/web/src/features/generator/browser-compiler.ts apps/web/src/features/generator/GeneratorPage.test.tsx apps/web/src/features/generator/browser-compiler.test.ts
git commit -m "fix(web): compile dynamic template fields"
```

### Task 4: Revert Failed Interface Setting Updates

**Files:**
- Modify: `apps/web/src/settings/InterfaceSettingsProvider.tsx:20-95`
- Modify: `apps/web/src/settings/InterfaceSettingsProvider.test.tsx`
- Modify: `apps/web/src/features/settings/SettingsPage.tsx:59-66`
- Modify: `apps/web/src/features/settings/SettingsPage.test.tsx`

- [ ] **Step 1: Add persistence-failure tests**

Mock `saveInterface` to reject. Change the theme from dark to light and assert the UI and root dataset first update optimistically, then return to dark after rejection. Assert an accessible alert is visible:

```ts
expect(document.documentElement.dataset.theme).toBe("dark");
expect(await screen.findByRole("alert")).toHaveTextContent(/界面设置保存失败/);
```

- [ ] **Step 2: Run focused tests and verify RED**

```bash
npm --workspace @promptvault/web test -- --run src/settings/InterfaceSettingsProvider.test.tsx src/features/settings/SettingsPage.test.tsx
```

Expected: FAIL because the current provider retains the optimistic value and SettingsPage ignores its error.

- [ ] **Step 3: Make updateSettings awaitable and rollback-safe**

Change the context signature to:

```ts
updateSettings: (next: InterfaceSettings) => Promise<void>;
```

Capture the previous value before updating. On save failure, restore both React state and document attributes to the previous value, set a normalized error, and rethrow or resolve only after rollback. Clear stale errors before a new save.

- [ ] **Step 4: Render the error in InterfacePanel**

Consume `error` from `useInterfaceSettings()` and render:

```tsx
{error ? <p className="form-error" role="alert">界面设置保存失败，请重试。</p> : null}
```

Keep controls interactive after failure.

- [ ] **Step 5: Run focused tests and commit**

```bash
npm --workspace @promptvault/web test -- --run src/settings/InterfaceSettingsProvider.test.tsx src/features/settings/SettingsPage.test.tsx
git add apps/web/src/settings/InterfaceSettingsProvider.tsx apps/web/src/settings/InterfaceSettingsProvider.test.tsx apps/web/src/features/settings/SettingsPage.tsx apps/web/src/features/settings/SettingsPage.test.tsx
git commit -m "fix(web): rollback failed interface preferences"
```

### Task 5: Prevent Mobile Detail Content From Hiding Behind Navigation

**Files:**
- Modify: `apps/web/src/features/library/library-fixes.css`
- Modify: `apps/web/src/styles.css`
- Modify: `tests/e2e/prompt-library.spec.ts`

- [ ] **Step 1: Add a mobile layout assertion**

At a `390x844` viewport, open the first Prompt detail, scroll `.detail-scroll` to its maximum, and compare the last Prompt block with the bottom navigation:

```ts
expect(lastBlockBox!.y + lastBlockBox!.height).toBeLessThanOrEqual(navBox!.y);
```

- [ ] **Step 2: Run the focused E2E and verify RED**

Expected: FAIL because the final Prompt content remains behind the approximately 60px mobile navigation.

- [ ] **Step 3: Reserve mobile safe area inside the fixed detail panel**

Under the mobile breakpoint, add bottom padding to the scrollable detail content rather than changing image sizing:

```css
@media (max-width: 700px) {
  .detail-scroll {
    padding-bottom: calc(74px + env(safe-area-inset-bottom));
  }
}
```

Confirm the full-media viewer remains centered and the complete image still uses `object-fit: contain`.

- [ ] **Step 4: Verify desktop and mobile**

Check `1440x900` and `390x844`: no horizontal overflow, detail close/edit controls remain visible, both Prompt blocks can scroll above navigation, and the media viewer fits.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/library/library-fixes.css apps/web/src/styles.css tests/e2e/prompt-library.spec.ts
git commit -m "fix(web): clear mobile navigation in prompt detail"
```

### Task 6: Replace Stale Server-Owned E2E Tests

**Files:**
- Modify: `tests/e2e/generator.spec.ts`
- Modify: `tests/e2e/prompt-library.spec.ts`
- Modify: `playwright.config.ts`

- [ ] **Step 1: Rewrite the generator E2E around the current workflow**

Remove the obsolete `重试翻译` assertion. Test model/task/template cascade, local bilingual generation, copy controls, and save-to-library. When Provider is unconfigured, assert no enhancement button is shown and local generation still succeeds.

- [ ] **Step 2: Rewrite the Prompt library E2E around IndexedDB**

Remove all `/api/v1/prompts` requests. Create a Prompt through the UI, close its detail, search by title, reopen it, and assert both saved title and Chinese content. Use a unique title and clean IndexedDB through page context before/after the test rather than calling removed server APIs.

- [ ] **Step 3: Add the responsive detail assertion from Task 5**

Keep desktop create/reopen and mobile detail visibility as separate tests so a responsive failure reports independently.

- [ ] **Step 4: Make the test server deterministic**

Keep `baseURL` and `webServer.url` aligned. Do not use `reuseExistingServer: true` in CI. Local reuse may be enabled only through an explicit environment flag so tests cannot silently target a different worktree's Vite process.

- [ ] **Step 5: Run the focused E2E suite**

```bash
npm run test:e2e -- tests/e2e/prompt-library.spec.ts tests/e2e/generator.spec.ts
```

Expected: all tests PASS against the current worktree's server.

- [ ] **Step 6: Run the full release verification**

```bash
npm test
npm run typecheck
npm --workspace @promptvault/web run build
npm run test:e2e
```

Expected: all commands PASS. Confirm there are no console warnings/errors on `/library`, `/generator`, `/knowledge`, and `/settings` at desktop and mobile viewports.

- [ ] **Step 7: Commit**

```bash
git add tests/e2e/generator.spec.ts tests/e2e/prompt-library.spec.ts playwright.config.ts
git commit -m "test(e2e): cover browser-local prompt workflows"
```

## Worktree Repair Note

The review worktree currently contains a broken `node_modules` symbolic link targeting `.worktrees/node_modules`; `npx prisma generate` fails with `ENOENT` while normal npm scripts resolve dependencies from the repository root. Before final verification, remove only that broken worktree-local link and recreate it with the correct target or run the repository's approved dependency bootstrap. Do not modify or delete the root `node_modules` directory.

Verify afterward:

```bash
npx prisma generate
npm test
```

Both commands must exit zero sequentially.

## Final Acceptance Checklist

- [ ] Provider enhancement retains distinct valid Chinese and English output.
- [ ] Provider failure or malformed output preserves the complete local result.
- [ ] Conflicting Skills cannot produce a contradictory Prompt.
- [ ] Every required template field renders, validates, and resolves in both languages.
- [ ] Failed interface persistence restores the previous visible setting and reports an alert.
- [ ] Mobile Prompt details can scroll fully above the bottom navigation.
- [ ] E2E tests no longer reference `重试翻译` or `/api/v1/prompts`.
- [ ] Unit tests, typecheck, build, Prisma generation, and all E2E tests pass.
- [ ] No Provider configuration enters `.prompt` exports.
- [ ] No unrelated UI restyle or catalog-content changes are included.
