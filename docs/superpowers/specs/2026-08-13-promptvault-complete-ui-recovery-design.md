# MT-Prompt Complete UI Recovery Design

Date: 2026-08-13

## 1. Goal

Complete the partially implemented MT-Prompt browser-Vault recovery without returning to the Prisma-backed runtime. The work fixes the five reported UI and behavior problems and restores the original V1 generator and knowledge presets: four model profiles, nineteen model-specific tasks, nineteen matching templates, and fifteen starter Skills.

The application remains local-first. Prompt, media, knowledge, and interface settings continue to live in IndexedDB. Provider requests remain explicit and use the existing stateless same-origin proxy.

## 2. Root Causes

The reported problems have distinct causes:

1. The library header mixes a styled file-input label with buttons whose shared alignment and responsive sizing are incomplete.
2. Prompt detail renders text blocks without copy actions, and its cover uses `object-fit: cover`, which crops tall and wide media.
3. The previous recovery commit only added a small browser knowledge subset. It did not port the V1 model/task/template hierarchy or the full Skill catalog from `prisma/seed-data.ts`.
4. Knowledge and settings pages retain fixed `max-width` limits, so they occupy only part of the workspace.
5. Interface settings are persisted but no application-level consumer applies theme, default library view, or compact density. Controls therefore appear to have no effect.

## 3. Data Model and Migration

### 3.1 Browser knowledge metadata

Keep the existing `knowledge` IndexedDB store and repository boundary. Extend the browser domain with explicit model and task metadata rather than encoding relationships in display strings or reintroducing Prisma entities.

The built-in catalog contains:

- four model profiles copied from the V1 seed source;
- nineteen tasks associated with their model stable keys;
- one template per task, including its bilingual body and field schema;
- fifteen Skills with category, priority, conflict group, and compatible model keys;
- the existing personal rule records.

Templates and Skills remain editable through the current copy-on-edit behavior. Built-in model and task definitions are read-only catalog metadata. User-created templates can select a model/task association; existing user templates without association remain available under a general/custom group.

### 3.2 Versioned initialization

Increment the built-in knowledge set version. Initialization inserts missing stable keys and upgrades shipped built-in definitions only when their stored record is still an untouched built-in record. It never overwrites user-owned records, user copies, or user-created stable keys.

User-controlled enabled state is preserved across built-in content upgrades. This avoids re-enabling a Skill that a user intentionally disabled.

## 4. Prompt Library and Detail

The library header uses one stable action group. Import, export, and create controls share height, inline icon alignment, padding, focus treatment, and wrapping rules. The hidden file input remains accessible through the import label.

Prompt detail adds a copy command to both Chinese and English Prompt headings. Copy status is scoped per language and resets after a short interval. Clipboard failures show an accessible inline status instead of failing silently.

The primary image uses `object-fit: contain`, a bounded responsive area, and its intrinsic aspect ratio. Clicking it opens a full-viewport media viewer with a close button; video continues to use native controls. This shows the complete image without forcing the detail drawer to match the image dimensions.

## 5. Generator

The generator restores the V1 selection flow:

1. select one of four models;
2. select a task compatible with that model;
3. select the matching template;
4. enter the requirement and any template fields;
5. select compatible enabled Skills grouped by category;
6. compile deterministic bilingual output.

Changing the model clears incompatible task, template, and Skill selections. Changing the task selects its preferred template and clears incompatible Skills. Compilation records the selected template and Skill snapshots in Prompt provenance.

Local generation remains the primary action and works with no network. When Provider settings are configured, a separate explicit Provider enhancement action can improve an already compiled result through the existing proxy. Provider failure leaves the deterministic result intact and displays a recoverable error.

Both results retain copy commands and can be saved to the Prompt library. Save state prevents duplicate submissions.

## 6. Templates and Skills

The page becomes a full-width workbench with four page-level tabs:

- Models and tasks: grouped by model, showing its tasks and template coverage;
- Templates: searchable catalog with model/task context, ownership, enable state, and edit action;
- Skills: searchable catalog grouped or filtered by category and compatible model;
- Personal rules: searchable list with ownership, enable state, and edit action.

The page uses unframed sections and compact list rows rather than nested cards. Creation and editing reuse the existing modal pattern. Built-in edits create user copies; user records update in place. Empty, loading, and search-no-result states are distinct.

The page has no fixed desktop `max-width`. Its inner content grows across the available workspace with readable column constraints. At narrow widths, filters stack and list metadata wraps without horizontal overflow.

## 7. Settings and Live Interface Preferences

Settings becomes a full-width two-column workbench on desktop: compact section navigation on the left and the active section on the right. On mobile, section navigation becomes tabs above the content.

Sections are Provider, Interface, and Data Boundary. Provider retains masked key input, save, test, and clear controls and clearly states browser-local storage limitations. Data Boundary explains what remains local and that `.prompt` transfer occurs in the library.

Interface preferences become live application behavior:

- theme sets a root `data-theme` value, with system preference observed while `system` is selected;
- library view initializes from the saved default and later manual view changes update the saved preference;
- compact mode sets a root density attribute used by shared page, row, input, and action spacing.

An application-level interface settings provider loads the preferences once, exposes them to pages, persists updates, and applies root attributes. Controls update this provider immediately, so visual changes do not require a reload.

## 8. Responsive and Visual Rules

All workspaces use the full width available after navigation. Content uses `minmax(0, 1fr)` and explicit responsive grid tracks to prevent overflow. Existing desktop sidebar, compact sidebar, and mobile bottom navigation remain unchanged.

At desktop width, generator inputs and output remain side by side. Knowledge and settings use the full workspace. At mobile width, generator, settings navigation, toolbars, and action groups stack into one column. Prompt detail and media viewer use the available viewport above the bottom navigation.

The existing restrained green/dark visual language remains. The work does not introduce marketing sections, decorative gradients, large-radius cards, or unrelated branding changes.

## 9. Error Handling

- Clipboard failure produces an accessible message and preserves the Prompt text.
- Built-in migration failure aborts its IndexedDB transaction and leaves prior records intact.
- Provider enhancement errors do not clear deterministic output.
- Invalid or missing model/task/template selections prevent compilation and identify the missing selection.
- Settings persistence failure reverts the optimistic control value and reports the failure.
- Media without a usable Blob URL falls back to the existing typed placeholder.

## 10. Verification

Unit and component tests cover:

- catalog counts and stable model/task/template/Skill associations;
- migration behavior for clean, existing, disabled, and user-owned knowledge records;
- generator cascading selection, compatible Skills, local compilation, Provider enhancement failure, copy, and save;
- knowledge tabs, search, ownership, enable state, and full catalog visibility;
- interface settings persistence and immediate root/theme/density behavior;
- default library view consumption;
- detail copy success/failure and full-image viewer behavior;
- header action semantics and accessible file input.

End-to-end and browser verification cover `/library`, `/generator`, `/knowledge`, and `/settings` at 1440x900 and 390x844. Checks include action alignment, full-width use, image framing, copy interactions, settings reactions, overflow, overlaps, console errors, and persistence after reload.

Typecheck, all workspace tests, production build, and focused Playwright suites must pass before completion.

## 11. Scope Boundaries

This recovery does not add accounts, synchronization, direct image/video generation, a server database, storage quota displays, or automatic AI calls. It does not overwrite user content or redesign unrelated library workflows.
