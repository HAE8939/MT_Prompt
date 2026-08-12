# MT-Prompt Browser Vault Design

## 1. Purpose and Scope

MT-Prompt is a lightweight Prompt workbench deployed through Docker and used by multiple people over a LAN. The application improves how users create, organize, use, and share Prompts. User Prompts are the primary asset; the Docker application is a replaceable tool and must not become the owner of user data.

This design replaces the current server-owned SQLite storage model with an independent browser Vault for each user and device. It also renames PromptVault to MT-Prompt, refreshes the responsive UI, introduces the `.prompt` sharing format, and reduces the Docker runtime to static delivery plus a stateless OpenAI-compatible Provider proxy.

The current SQLite database and all existing source data remain intact during migration. Only the ten approved example Prompts ship in the final application. The other existing Prompts are excluded from the final image after the conversion path has been verified; they are not destructively deleted as part of the migration.

Automatic synchronization, accounts, a shared team Vault, cloud storage, and a desktop-managed `.PromptVault` directory are outside this scope. A future desktop client may add the `.PromptVault` directory after the browser version is stable.

## 2. Product Principles

1. Prompts and their media belong to the browser user, not the Docker host.
2. Local Prompt workflows remain available when the Provider is unavailable or slow.
3. Sharing is explicit and portable through `.prompt` files.
4. The runtime stays small: no production database, ORM, server-side asset store, or synchronization service.
5. Imports never overwrite or remove local content without an explicit user action.
6. Provider configuration is device-local and never included in an export.

## 3. Runtime Architecture

The production system has two runtime components.

### 3.1 Browser application

The React application owns:

- IndexedDB persistence;
- Prompt, asset, version, knowledge, and settings repositories;
- deterministic bilingual compilation;
- search, sorting, filtering, and duplicate hints;
- `.prompt` creation, validation, preview, and import;
- all non-Provider Prompt workflows.

Pages and components call typed repository and domain interfaces. They do not access IndexedDB directly. This keeps storage replaceable if a desktop client later uses a filesystem-backed Vault.

### 3.2 Stateless Docker service

The Docker service owns only:

- static frontend delivery;
- a health endpoint;
- a constrained OpenAI-compatible Provider proxy.

The proxy receives the Provider base URL, model, and key with an explicit user request. These values live in request memory only. The service does not persist, cache, inspect for analytics, or log authorization headers, request bodies, or response bodies. Logs contain only nonsensitive operational fields such as request ID, route, status, duration, and a normalized error category.

The service must bind to a configurable LAN interface. It has no SQLite database, Prisma runtime, server asset directory, export directory, or required data volume.

## 4. Browser Vault

The versioned IndexedDB database is named `mt-prompt-vault`. It contains the following logical stores:

| Store | Contents |
| --- | --- |
| `prompts` | Current bilingual Prompt content, negative Prompt, title, description, classification, tags, rating, favorite state, origin, and timestamps |
| `assets` | Image/video Blob, Prompt relationship, role, filename, MIME type, dimensions, byte size, and checksum |
| `versions` | Immutable local snapshots created by Prompt edits |
| `knowledge` | Built-in and user templates, Skills, and personal rules |
| `settings` | Provider configuration and nonsensitive interface preferences |
| `meta` | Schema version, migration journal, example import marker, and built-in content versions |

Records use stable UUIDs. IndexedDB schema changes run as ordered, versioned migrations and never clear an existing Vault. Prompt and asset mutations that must remain consistent use one transaction. An error aborts the full transaction and leaves existing data unchanged.

Provider base URL, model, and key are persisted only in the current browser's Vault. The key is masked by default in the UI and can be replaced or cleared. This browser-only model does not provide an operating-system credential vault: a person with access to the browser profile or developer tools may be able to read the key. The UI and documentation state this boundary plainly.

The settings page does not display used storage or browser quota.

If IndexedDB is missing or disabled, MT-Prompt shows a blocking read-only error state. It must never report a successful save without durable completion.

## 5. Built-In Examples and Migration

The final application includes exactly these ten example Prompts:

1. 毛坯房转现代客厅效果图
2. 卫生间防水与石材湿区综合展板
3. 现代中餐厅动线与材质综合展板
4. 民宿外立面改造综合展板
5. 无主灯吊顶施工工艺综合展板
6. 屋顶花园空中露台综合展板
7. 五星级酒店大堂综合设计展板
8. 城市更新商业街区综合展板
9. 户外铝合金凉亭
10. 黑胡桃实木餐椅

They are static seed data imported once when a new browser Vault is created. Each has a stable built-in ID and content version. Editing or deleting an example is a user decision; later application releases do not restore or overwrite it. Newly introduced built-in content, if approved in a future release, uses a new stable ID and an explicit incremental migration.

Before the production runtime stops using SQLite, a migration utility converts selected existing server data into a valid `.prompt` package. The conversion is validated by importing it into a clean browser Vault and comparing Prompt counts, bilingual content, relationships, media checksums, and knowledge snapshots. The original database and storage directories remain recoverable until this validation passes.

## 6. `.prompt` Package Format

`.prompt` is a standard ZIP container with a product-specific extension. Prompt and associated media form the required core of an export. The export dialog offers two independent optional inclusions:

- nonsensitive application settings, such as theme, language, layout, and view preference;
- the complete knowledge library, including templates, Skills, and personal rules.

Provider base URL, Provider model, Provider key, and any equivalent Provider fields are forbidden in every package, regardless of export selections.

The container has this logical layout:

```text
manifest.json
prompts.json
provenance.json
settings.json          # optional, nonsensitive allowlisted fields only
knowledge.json         # optional, complete knowledge library
assets/<asset-id>      # associated images and videos
```

`manifest.json` declares the format version, creation time, Prompt count, optional sections, and every entry's byte size and SHA-256 checksum. `provenance.json` contains the templates and Skills actually used by the exported Prompts as immutable generation snapshots. Prompt editing history is not exported; imported Prompts begin a new local version sequence.

Export supports one Prompt, multiple selected Prompts, or all currently selected Prompts. There is no separate full-Vault backup product. Selecting all Prompts plus optional settings and knowledge still produces the same `.prompt` sharing package and never includes Provider configuration.

### 6.1 Import safety

Import has two phases:

1. Parse, validate, checksum, and present a preview without writing data.
2. After confirmation, write all selected sections in one transaction.

The parser limits package size, uncompressed size, individual entry size, entry count, accepted paths, supported MIME types, and supported format versions. It rejects absolute paths, parent traversal, duplicate paths, checksum failures, undeclared entries, malformed records, and packages requiring a newer incompatible format.

Prompt conflicts follow these rules:

- same stable ID and same content: skip;
- same stable ID but different content: create an imported conflict copy with a new ID;
- different ID but highly similar content: import and show a possible-duplicate result;
- never overwrite or delete a local Prompt automatically.

Knowledge conflicts follow these rules:

- same stable ID and same content: skip;
- same stable ID but different content: create a user-owned copy;
- same name but different ID: import and mark as a possible duplicate;
- never overwrite built-in knowledge.

Imported provenance snapshots stay attached to their Prompt and do not automatically enter the editable knowledge library. The user may explicitly save a snapshot as a personal template or Skill. If the package includes a complete knowledge library and the user selects it during import, that library is merged using the knowledge conflict rules.

Application settings import only allowlisted nonsensitive fields present in the package. It never clears unrelated local settings. The preview lets the user independently enable or disable settings and complete knowledge import.

## 7. Brand and Responsive UI

The product name is `MT-Prompt`. The supplied SVG logo is copied into the application as a source asset and retains `currentColor`, allowing an accessible light color on the dark navigation and a dark green color on light surfaces. The application introduces no external font or heavy image dependency for branding.

The approved visual direction is the B option, "安静工作台": restrained, compact, readable, and designed for repeated work rather than presentation.

### 7.1 Navigation and breakpoints

- At 1200 px and above, a fixed text sidebar shows Prompt 库, 生成器, 模板与技能, and 设置.
- From 768 px through 1199 px, the sidebar collapses to stable icon controls with tooltips.
- Below 768 px, primary navigation becomes a bottom bar. Lists become single-column, details and editors become full-screen, and generator columns stack vertically.

The page header contains only the current title, contextual search, and primary commands. It does not duplicate global navigation.

### 7.2 Prompt library

The default desktop presentation is a compact horizontal card/list optimized for scanning cover, title, tags, media type, and favorite status. Users can switch between list and grid views. Filters cover category, image, video, and favorites. Search, multi-select, import, and export are first-class actions.

Opening a Prompt uses a detail drawer on wide layouts to preserve library context. Creating or editing opens a dedicated editor. On mobile, details and editing use the full viewport.

### 7.3 Generator

The generator uses a parameter form beside Chinese and English results on wide screens. On smaller screens, inputs and outputs stack. A completed result can be copied, saved to the Vault, or exported without unnecessary page transitions. Provider failure does not block deterministic local output.

### 7.4 Templates and Skills

Templates, Skills, and personal rules use page-level tabs with shared search, create, edit, enable, and disable patterns. Built-in ownership and personal copies are visually explicit without adding decorative cards.

### 7.5 Settings

Settings are grouped into Provider, interface, and data sections. Provider controls support save, connection test, masked key display, and clear. Data controls manage `.prompt` import and export. Storage usage and quota are not shown.

The design avoids large gradients, nested cards, decorative backgrounds, excessive rounding, and heavy motion. Text must remain readable without overlap at all supported sizes. Icons come from the existing Lucide dependency and unfamiliar controls receive tooltips.

## 8. Reliability and Error Handling

- Repository methods return typed domain errors for quota failure, unsupported storage, corrupt data, transaction failure, and constraint conflicts.
- Import parsing completes before any IndexedDB write. A failed import leaves the Vault unchanged.
- Space exhaustion or asset write failure never removes existing content.
- Local creation, editing, compilation, search, import, and export remain usable when the Provider proxy is unavailable.
- Provider timeout and upstream errors are categorized and shown without exposing secrets or raw sensitive responses.
- A service worker or offline application shell is not required by this scope. The data architecture must not prevent it later.

## 9. Lightweight Deployment

Docker uses a multi-stage build. The final image contains the compiled frontend and the minimum runtime needed for static delivery, health checks, and Provider proxying. Prisma Client, SQLite libraries and files, source maps not intended for production, development dependencies, test artifacts, seed sources beyond the ten examples, and server-side user-data directories are excluded.

The image exposes a configurable LAN port and requires no persistent volume. Rebuilding or replacing the container does not affect browser Vaults. Cache headers must permit fingerprinted assets to cache aggressively while the application entry point remains upgrade-aware.

The project records compressed frontend asset size and final image size during release verification. Material growth requires an explicit explanation.

## 10. Verification and Acceptance

### Unit and domain tests

- every IndexedDB migration from each supported schema version;
- repository transaction rollback and relationship integrity;
- deterministic compiler output;
- Prompt and knowledge conflict rules;
- `.prompt` manifest, checksum, limits, and path validation;
- absolute exclusion of Provider base URL, model, key, and aliases from packages;
- allowlisted application settings export and merge behavior.

### Component tests

- primary actions, empty states, loading states, and failures across all four pages;
- list/grid switching, filtering, multi-select, detail drawer, and editing;
- generator stacking and output actions;
- package preview and independently selectable optional sections;
- masked Provider key, test, replace, and clear behavior.

### End-to-end tests

- first-run initialization creates exactly ten examples once;
- Prompt creation, bilingual editing, version creation, favorite state, and associated media;
- deterministic generation remains available during Provider failure;
- selected export and re-import preserve Prompt content and media checksums;
- conflict import creates copies without overwriting local data;
- optional settings and knowledge are imported only when selected;
- Provider data never appears in a generated package;
- desktop, tablet, and mobile navigation and content remain usable without overlap.

### Docker acceptance

- another LAN device can load and use MT-Prompt;
- separate browsers maintain independent Vaults;
- container recreation preserves browser data;
- the container creates no user Prompt, asset, Provider, database, or export files;
- logs contain no Provider key, authorization header, request body, or response body;
- final bundle and image sizes are reported.

## 11. Delivery Sequence

Implementation should proceed in recoverable stages:

1. Establish MT-Prompt branding, domain types, and browser repository contracts.
2. Implement and test IndexedDB stores and migrations while keeping the existing app operational.
3. Move deterministic compiler and knowledge reads into the browser.
4. Implement `.prompt` export, validation, preview, import, and SQLite conversion tooling.
5. Connect the four responsive pages to the browser repositories and apply the approved UI direction.
6. Reduce the API to the constrained Provider proxy and health/static service.
7. Build and verify the minimal Docker image across LAN and responsive viewports.
8. Remove production dependence on Prisma and SQLite only after migration acceptance passes.

