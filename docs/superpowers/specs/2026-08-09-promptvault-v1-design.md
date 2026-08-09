# PromptVault V1 Design

Date: 2026-08-09

## 1. Product Definition

PromptVault V1 is a single-user, local-first Windows web application for managing visual-generation prompts and assembling new prompts from reusable templates, skills, and personal rules.

The product has two equal responsibilities:

1. Preserve prompt assets together with reference and result images, metadata, versions, and searchable organization.
2. Turn reusable prompting knowledge into deterministic Chinese and English prompts through a local compiler.

The first release supports four model profiles without calling their generation APIs:

- GPT-IMAGE 2
- Nano Banana 2
- Kling 3.0
- Seedance 2.0

External APIs are used only to translate user-entered dynamic values. OpenAI and Microsoft Translator are both supported through a common adapter.

## 2. V1 Scope

### Included

- Prompt library with search, pagination, filtering, sorting, ratings, statuses, tags, and categories
- Prompt create, view, edit, version, and delete workflows
- Local image assets for cover, reference, result, and comparison roles
- Model-specific tasks for all four supported model profiles
- Template and skill libraries with create, edit, enable, disable, and version workflows
- Personal rules with model/task applicability and explicit priority
- A three-step structured Prompt Generator
- Deterministic bilingual compilation with translation of dynamic user input
- Generation provenance through compilation records
- Local settings for translation providers and storage health
- Complete ZIP export containing JSON data, knowledge configuration, and assets
- Seed data for four models, nineteen initial tasks, nineteen matching templates, and fifteen starter skills from the project documents
- One root command that starts the web and API applications

### Excluded

- Authentication, multiple users, permissions, and cloud synchronization
- Direct calls to image or video generation models
- Automatic image understanding
- AI-based prompt optimization, scoring, or conflict resolution
- Visual node-based template or skill editing
- COS storage implementation; V1 includes only the adapter boundary
- Docker packaging and public deployment

## 3. Experience Direction

The interface is a restrained professional workbench derived from the supplied dark prototype.

- Use dark gray surface hierarchy instead of large areas of pure black.
- Reserve purple for focus, selection, and primary actions.
- Keep layouts compact, stable, and optimized for repeated use.
- Treat images as primary content while keeping metadata easy to scan.
- Use icons for familiar actions and labels only where meaning would otherwise be ambiguous.
- Keep card radii at 6px or less unless a library component requires a compatible value.
- Do not create a dashboard-style landing page. The application opens directly to the Prompt Library.

The desktop layout uses a persistent left navigation, a main working area, and a docked detail panel. Narrow viewports collapse navigation and show Prompt detail as a full-page route without overlapping content.

## 4. Information Architecture

### Prompt Library: `/library`

- Search title, description, prompt content, tags, category, and model.
- Filter by model, model task, category, tags, status, and rating.
- Sort by updated time, created time, title, and rating.
- Switch between image grid and compact list views.
- Open Prompt detail in a docked panel on wide screens and a route on narrow screens.

### Prompt Detail and Editor: `/prompts/:id`

- Display cover, reference, result, and comparison assets.
- Display Chinese and English positive and negative prompts separately.
- Copy each language independently.
- Show model, task, category, tags, rating, status, version history, and generation provenance.
- Support editing, asset management, version notes, and confirmed deletion.
- Open the Prompt in the Generator with its source configuration preselected when provenance exists.

### Prompt Generator: `/generator`

The Generator is a structured three-step workflow rather than a chat interface.

1. Select a model profile, model-specific task, and compatible template.
2. Fill the template-defined Chinese fields, select compatible skills, and review active personal rules.
3. Compile Chinese and English results, copy either language, retry translation, or save the result to the library.

Templates expose a field schema that drives the second-step form. Changing a model resets incompatible tasks, templates, and skills with a clear confirmation when user input would be lost.

### Knowledge: `/knowledge`

- Tabs for Templates, Skills, and Personal Rules.
- Search, filter, create, edit, enable, disable, and inspect versions.
- Display compatible models and tasks, priority, conflict group, and usage count.
- Keep knowledge management out of the Settings page because it is a primary product capability.

### Settings: `/settings`

- Select OpenAI or Microsoft Translator and verify credentials.
- Store credentials in Windows Credential Manager, never in browser storage or SQLite.
- Display the current local storage path and health checks.
- Trigger complete data export.
- Show application, schema, seed-data, and compiler versions.

## 5. Repository Architecture

Use npm Workspaces with the following top-level structure:

```text
PromptVault/
  apps/
    web/                 React, TypeScript, Vite
    api/                 Node.js, TypeScript, Fastify
  packages/
    contracts/           Shared Zod request and response schemas
    compiler/            Pure Prompt compilation domain package
  prisma/
    schema.prisma
    seed.ts
  database/              Local SQLite runtime data
  storage/               Local binary assets
  docs/
  backups/
  exports/
  package.json
```

The root development command starts both applications. The web application communicates only through the HTTP API and never reads SQLite or the filesystem directly.

### Frontend

- React and TypeScript with Vite
- Tailwind CSS and shadcn/ui
- React Router for routes
- TanStack Query for server state
- React Hook Form and Zod for forms
- No Redux or other global state framework in V1

### API

- Fastify with typed route schemas from `packages/contracts`
- Prisma with SQLite
- Service boundaries for prompts, assets, catalog data, compilation, translation, credentials, and export
- Structured logs that redact credentials and user prompt content by default

### Compiler

`packages/compiler` is a pure TypeScript package. It receives complete model, task, template, skill, rule, and localized input objects; it does not query Prisma or call translation services.

This boundary keeps compilation deterministic and independently testable.

## 6. Storage Architecture

SQLite stores structured records and asset metadata. Image bytes remain on disk.

The storage interface supports operations equivalent to:

```ts
interface StorageAdapter {
  put(input: PutObjectInput): Promise<StoredObject>;
  remove(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  createReadStream(key: string): Promise<NodeJS.ReadableStream>;
}
```

V1 implements `LocalStorageAdapter`. A later `CosStorageAdapter` can implement the same contract without changing Prompt or Asset services.

Local keys use date and role partitioning:

```text
storage/images/YYYY/MM/{cover|reference|result|comparison}/{uuid}.{ext}
```

The database stores adapter keys, not absolute filesystem paths or public URLs.

Upload behavior is compensating rather than partially successful:

1. Validate MIME type, extension, size, and decodable image metadata.
2. Write to a temporary file in the target filesystem.
3. Atomically move the file into its final key.
4. Create the Asset record.
5. Remove the final file if the database transaction fails.

## 7. Data Model

### Creative Assets

- `Prompt`: title, description, Chinese/English positive and negative content, status, rating, origin, model task, category, timestamps
- `Asset`: prompt, role, storage key, MIME type, original name, width, height, byte size, checksum, timestamps
- `Tag`: unique normalized name and optional type
- `PromptTag`: many-to-many Prompt and Tag association
- `Category`: self-referencing hierarchy with unique sibling names
- `PromptVersion`: immutable content and metadata snapshot with version number and change note

### Reusable Knowledge

- `Model`: provider, media type, description, enabled state, and stable key
- `ModelTask`: model-specific task name, stable key, capabilities, ordering, and enabled state
- `PromptTemplate`: model task, bilingual name and description, bilingual template bodies, field schema JSON, enabled state, and version
- `PromptSkill`: bilingual name, description, and content; category, priority, conflict group, enabled state, and version
- `SkillModelTask`: compatible model-task associations
- `TemplateSkill`: recommended or required skills for a template
- `PersonalRule`: bilingual content, priority, enabled state, and optional model-task applicability

### Generation Provenance

- `CompilationRun`: model task, template version, localized input values, compiled Chinese and English output, compiler version, translation provider and status, timestamps
- `CompilationSkill`: the exact selected skill IDs and versions used by a run
- `Prompt.compilationRunId`: optional link from a saved generated Prompt to its source run

Version references in a compilation record are immutable snapshots or immutable version rows. Later edits to a template or skill must not change historical provenance.

## 8. Prompt Compiler

### Localized Knowledge

Templates, skills, and personal rules store reviewed Chinese and English content. The translation API is used only for dynamic values entered in Chinese. This reduces cost and preserves model-specific terminology.

### Compilation Flow

1. Validate that model task, template, selected skills, and field values are compatible and enabled.
2. Detect missing required fields and selected skill conflict groups.
3. Translate non-empty dynamic Chinese field values into English through the selected provider.
4. Load the bilingual template, selected skills, and applicable personal rules.
5. Build localized sections in task-defined order: constraints, reference control, modification target, style, camera language, and decorative detail.
6. Remove empty sections and normalize whitespace without rewriting user meaning.
7. Return Chinese output, English output, warnings, and complete provenance metadata.

The same normalized input and knowledge versions must produce byte-for-byte identical output, excluding timestamps and translation-provider variability. Tests use a fake translation adapter with fixed responses.

### Conflict Rules

- Skills in the same non-empty conflict group are mutually exclusive by default.
- Personal rules have higher priority than ordinary skills.
- Required template skills cannot be removed.
- Priority can order compatible content but cannot silently resolve semantic contradictions across unrelated groups.
- When the compiler cannot resolve a conflict deterministically, it stops and returns the conflicting rule IDs and user-facing explanations.

### Translation Failure

- Chinese compilation remains complete and usable.
- English output is marked `FAILED`, not emitted as mixed Chinese and English text.
- The user can retry the same provider or switch providers without rerunning Chinese compilation.
- Translation results are stored with the compilation record so opening a saved Prompt does not call the provider again.

## 9. API Surface

All routes are under `/api/v1`.

### Prompts and Assets

- `GET /prompts`
- `POST /prompts`
- `GET /prompts/:id`
- `PATCH /prompts/:id`
- `DELETE /prompts/:id`
- `GET /prompts/:id/versions`
- `POST /prompts/:id/versions`
- `POST /prompts/:id/assets`
- `DELETE /assets/:id`

### Catalog and Knowledge

- `GET /models`
- `GET /models/:id/tasks`
- `GET /categories`
- `GET /tags`
- CRUD routes for `/templates`, `/skills`, and `/personal-rules`

### Compilation and Translation

- `POST /compiler/validate`
- `POST /compiler/compile`
- `POST /compilations/:id/retry-translation`
- `POST /compilations/:id/save-as-prompt`

### Settings and Export

- `GET /settings/status`
- `PUT /settings/translation-provider`
- `POST /settings/translation-provider/test`
- `POST /exports`
- `GET /exports/:id`

Request and response bodies are defined once in `packages/contracts`. List endpoints use stable cursor or page-based pagination consistently; V1 uses page and limit because the local dataset is bounded and the original API design already specifies them.

## 10. Error Handling

API errors use a stable envelope:

```json
{
  "error": {
    "code": "SKILL_CONFLICT",
    "message": "所选技能存在冲突。",
    "fieldErrors": {},
    "details": {}
  }
}
```

- Validation errors map to the exact form field.
- Expected domain errors use stable codes and safe details.
- Unexpected errors receive a request ID; stack traces remain server-side.
- Translation timeout, rate limit, invalid credentials, and provider outage are distinct codes.
- The frontend uses inline errors for correctable form problems and concise notifications for background or global failures.

Deleting a Prompt is confirmed in the UI. The database transaction removes related records first. File removal follows; failures are written to a cleanup queue so a successful business deletion is not falsely rolled back.

## 11. Data Protection and Export

- Ignore local storage, SQLite files, backups, exports, environment files, and visualization sessions in Git.
- Store provider secrets in Windows Credential Manager through a backend credential service.
- Never send secrets to the frontend after storage; return only provider and verification status.
- Redact secrets and Prompt text from default logs.
- Export a ZIP with a versioned manifest, JSON records, knowledge data, and the `assets/` tree.
- Export creation writes to a temporary file and atomically renames the completed archive.

## 12. Seed Data

Seed data is versioned and idempotent. Stable keys, rather than display names, identify built-in records.

The initial seed contains:

- Four model profiles
- Nineteen model-specific tasks:
  - GPT-IMAGE 2: image generation, reference redraw, local edit, scene-preserving edit, canvas expansion, and style transfer
  - Nano Banana 2: character replacement, object replacement, image fusion, character consistency, and local enhancement
  - Kling 3.0: image-to-video, text-to-video, camera motion, and character action
  - Seedance 2.0: cinematic storyboard, multi-shot video, narrative video, and commercial advertising
- One built-in bilingual template for each of the nineteen initial model tasks
- Fifteen starter skills: Reference Lock, Pixel-level Preservation, Minimal Modification, Scene Structure Lock, Luxury Interior Photography, Architectural Visualization, Material Realism, ARRI Alexa 65 Look, 24mm Architectural Lens, Cinematic Depth, Natural Light Preservation, Golden Hour Lighting, Blue Hour Cinematic, Character Consistency, and No Direct Eye Contact
- Sensible personal rules disabled by default so the application does not impose hidden behavior

Users can edit copies of built-in records. Seed upgrades must not overwrite user-edited records; built-in records use explicit ownership and version fields.

## 13. Testing and Acceptance

### Unit Tests

- Compiler field validation, localized template filling, ordering, whitespace normalization, conflict detection, priority, and deterministic output
- Storage key generation and validation
- Translation service routing, provider-specific error mapping, and secret redaction

### Integration Tests

- Prompt CRUD, search, filters, pagination, tags, versions, and cascade behavior
- Asset upload success and compensating cleanup on database failure
- Template, skill, and personal-rule compatibility rules
- Compilation persistence, translation retry, provenance, and save-as-Prompt
- Export manifest, records, and asset integrity

### Frontend and End-to-End Tests

- Component tests for filters, editors, dynamic generator fields, skill conflicts, and translation failure states
- Playwright coverage for four core workflows:
  1. Create and reopen a Prompt asset.
  2. Upload and display reference and result images.
  3. Generate Chinese and English prompts from a template and skills.
  4. Save a generated Prompt and inspect its provenance.
- Screenshot checks on wide desktop and narrow viewport layouts
- Accessibility checks for keyboard navigation, focus visibility, labels, dialogs, and color contrast

### Completion Criteria

- A fresh checkout installs and starts the complete application from the root command documented in README.
- `npm run setup` creates required runtime directories, synchronizes the local SQLite schema with `prisma db push`, and applies idempotent seed data; `npm run dev` starts the complete application. V1 intentionally uses this local-only schema synchronization path because Prisma Migrate's Windows Schema Engine deployment command is unavailable in the target environment; a deployment release must introduce verified migration history before multi-machine distribution.
- The four core Playwright workflows pass against a temporary SQLite database and temporary storage directory.
- The application remains usable when no translation provider is configured: Chinese compilation works and English generation clearly reports that configuration is required.
- No test, log, export, or Git-tracked file contains provider secrets.

## 14. Delivery Sequence

Implementation should proceed in vertical slices:

1. Workspace, shared contracts, database migration, seed framework, health endpoint, and application shell
2. Prompt Library CRUD, search, filters, tags, categories, and versions
3. Local asset storage, uploads, gallery, deletion cleanup, and export
4. Model tasks, templates, skills, personal rules, and knowledge management UI
5. Pure Compiler, translation adapters, three-step Generator, provenance, and save-to-library workflow
6. End-to-end verification, responsive polish, documentation, and release readiness

Each slice must leave the application runnable and include tests proportional to its behavior and risk.
