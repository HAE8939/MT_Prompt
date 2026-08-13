# Work Buddy Execution Handoff

## Objective

Complete the MT-Prompt UI and content recovery described in:

- `docs/superpowers/specs/2026-08-13-promptvault-complete-ui-recovery-design.md`
- `docs/superpowers/plans/2026-08-13-promptvault-complete-ui-recovery.md`

The user selected the full recovery option. Keep the browser IndexedDB Vault architecture. Do not restore Prisma or SQLite as production dependencies.

## Starting Point

Continue from the existing linked worktree and branch:

```text
Worktree: E:\19 Python File\PromptVault\.worktrees\complete-ui-recovery
Branch:   codex/complete-ui-recovery
HEAD:     5dba749887b1b8e5c6b479ae80d6223c1343980d
```

Do not start from `main`: Task 1 exists only on the feature branch.

Initial setup for a fresh checkout:

```powershell
npm install
npx prisma generate
npm test
npm run typecheck
```

`prisma generate` is required only because legacy API workspace typechecks reference generated Prisma types. It does not authorize restoring the database runtime or running `db push`/seed.

## Completed Work

Commit `5dba749 feat(web): restore complete built-in catalog` completed Task 1:

- typed browser catalog with exactly 4 models;
- 19 model-specific tasks;
- 19 matching templates;
- 15 starter Skills;
- 2 existing personal rules;
- knowledge migration version 3;
- migration preserves stored built-in enabled states and all user-owned records;
- no Prisma runtime import in the browser catalog.

Verification already run on this commit:

- focused catalog and migration tests: 12/12 passed;
- `npm --workspace @promptvault/web run typecheck`: passed;
- `git diff --check`: passed.

Before continuing, perform the planned Task 1 spec and code-quality review. Fix any Critical or Important findings before Task 2.

## Remaining Execution Order

Follow Tasks 2-6 in `docs/superpowers/plans/2026-08-13-promptvault-complete-ui-recovery.md` in order.

1. Add the application-level interface settings provider. Theme, density, and default library view must apply immediately and persist.
2. Fix library import/export/create action alignment. Add Chinese/English copy controls, clipboard error feedback, non-cropping media, and a full-screen media viewer to Prompt detail.
3. Restore the generator's model -> task -> template flow, compatible Skills, deterministic local output, explicit Provider enhancement, copy, provenance, and save.
4. Rebuild Templates and Skills plus Settings as full-width responsive workbenches. Knowledge tabs must cover models/tasks, templates, Skills, and personal rules.
5. Run full verification and browser QA at 1440x900 and 390x844.

Use test-driven development for each behavior: add a focused failing test, observe the expected failure, implement the minimum change, then run the focused and affected suites. Commit each completed task separately.

## Non-Negotiable Acceptance Criteria

- Existing user Prompts, user knowledge, and disabled built-in states are not overwritten.
- `/generator` visibly exposes all four original V1 models and their task/template relationships.
- `/knowledge` uses the available workspace width and exposes the complete catalog.
- `/settings` uses the available workspace width and its interface controls visibly react without reload.
- Library import, export, and create controls share height and baseline at desktop and mobile widths.
- Prompt detail has copy actions for both languages and does not crop the primary image.
- Provider enhancement failure never removes a locally compiled result.
- No horizontal overflow, incoherent overlap, or console errors at the two required viewports.
- Production remains browser-Vault-first; do not add a database dependency.

## Final Verification

Run from the feature worktree:

```powershell
npm run typecheck
npm test
npm --workspace @promptvault/web run build
npm run test:e2e -- tests/e2e/prompt-library.spec.ts tests/e2e/generator.spec.ts
git diff --check
git status --short
```

Start the app for visual verification with:

```powershell
npm run dev
```

Inspect `/library`, `/generator`, `/knowledge`, and `/settings` at 1440x900 and 390x844. Capture screenshots and record any console or overflow failures before claiming completion.

## Repository State

At handoff time both the main checkout and the feature worktree were clean. The main branch contains only the design, plan, and worktree-ignore commits. All implementation must continue on `codex/complete-ui-recovery` until it is reviewed and ready to integrate.
