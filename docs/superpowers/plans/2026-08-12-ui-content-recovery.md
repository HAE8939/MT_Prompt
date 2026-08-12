# MT-Prompt UI and Content Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the missing Prompt media and original workbench depth while improving logo contrast, icon clarity, responsive layout, and settings usability.

**Architecture:** Ship the approved ten Prompt covers as static seed assets and migrate their Blob bytes into IndexedDB without overwriting user-edited Prompt records. Rebuild generator and knowledge surfaces on the existing browser repositories, and keep Provider settings device-local while presenting a denser, more coherent workbench UI.

**Tech Stack:** React 19, TypeScript, IndexedDB, Lucide React, Vitest, Testing Library, Vite, Browser QA.

---

### Task 1: Restore Brand Contrast and Prompt Media

**Files:**
- Modify: `apps/web/public/logo.svg`
- Modify: `apps/web/src/workbench.css`
- Modify: `apps/web/src/vault/initialize-vault.ts`
- Modify: `apps/web/src/vault/initialize-vault.test.ts`
- Create: `apps/web/public/builtin-prompts/*.webp`

- [ ] Add failing tests proving ten covers and the first comparison image are stored once.
- [ ] Add a versioned asset migration which fetches packaged WebP files and never changes Prompt text.
- [ ] Copy only the approved eleven source files and strengthen the logo mark contrast.
- [ ] Verify initialization, library rendering, and existing-user non-overwrite behavior.

### Task 2: Restore Generator and Knowledge Workbench Depth

**Files:**
- Modify: `apps/web/src/vault/built-in-knowledge.ts`
- Modify: `apps/web/src/features/generator/GeneratorPage.tsx`
- Modify: `apps/web/src/features/generator/generator.css`
- Modify: `apps/web/src/features/knowledge/KnowledgePage.tsx`
- Modify: `apps/web/src/features/knowledge/knowledge.css`
- Modify: corresponding component tests

- [ ] Add failing tests for model/task/template controls, Provider enhancement controls, and complete template/Skill/rule sections.
- [ ] Expand versioned local knowledge seeds without overwriting user copies.
- [ ] Restore model/task/template hierarchy and explicit Provider actions to the local generator.
- [ ] Restore sectioned knowledge catalog, search, enable/edit controls, and responsive density.

### Task 3: Redesign Settings and Complete Visual QA

**Files:**
- Modify: `apps/web/src/features/settings/SettingsPage.tsx`
- Modify: `apps/web/src/features/settings/settings.css`
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/src/features/settings/SettingsPage.test.tsx`

- [ ] Add failing tests for Provider security messaging, interface preferences, and data boundary status.
- [ ] Implement a compact settings navigation and unframed settings bands with consistent icon buttons.
- [ ] Run all tests, typechecks, and builds.
- [ ] Verify all four pages at 1440x900 and 390x844 with Browser screenshots, interaction checks, overflow checks, and console inspection.
