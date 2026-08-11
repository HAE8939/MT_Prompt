# PromptVault Architecture

## Purpose

PromptVault is a local-first Windows workbench for organizing image and video prompts, compiling reusable bilingual prompts, and keeping prompt assets and history on the user's machine.

## Runtime

| Layer | Technology | Address | Responsibility |
| --- | --- | --- | --- |
| Web | React, Vite, TanStack Query | `127.0.0.1:5173` | Library, generator, knowledge, and settings UI |
| API | Fastify, Zod, Prisma | `127.0.0.1:3000` | Validation, orchestration, persistence, assets, export |
| Database | SQLite | `database/promptvault.db` | Prompt, knowledge, compilation, and version metadata |
| Files | Local filesystem | `storage/`, `exports/` | Uploaded images and generated ZIP archives |

Vite proxies `/api/v1` to the API during development. The API only listens on loopback and CORS only allows the local web origin.

## Code Boundaries

- `apps/web`: route-level React features and the shared API client.
- `apps/api`: Fastify composition plus feature services and routes.
- `packages/contracts`: shared Zod request and query contracts.
- `packages/compiler`: pure deterministic bilingual compilation.
- `prisma`: schema, seed data, runtime path setup, and Ciyuan import.

The API service layer owns transactions and filesystem coordination. React components never access SQLite or local storage paths directly.

## Main Flows

1. The Prompt library requests paginated Prompt DTOs, including model, task, tags, assets, and provenance.
2. The generator loads models, templates, and compatible Skills, then posts Chinese input to the compiler API.
3. The compiler snapshots the selected knowledge, produces Chinese output, attempts translation, and persists a `CompilationRun`.
4. Saving the result creates one linked `Prompt` and its initial `PromptVersion` in a transaction.
5. Asset uploads are written to a temporary file, atomically renamed, then recorded in SQLite. Failed database writes remove the file.
6. Export builds an atomic ZIP containing JSON metadata, assets, checksums, and a manifest.

## API Areas

- `/api/v1/prompts`, `/versions`: Prompt CRUD, filters, and history.
- `/api/v1/prompts/:id/assets`, `/assets/:id`: image upload, content, and deletion.
- `/api/v1/models`, `/templates`, `/skills`, `/personal-rules`: knowledge catalog and user-owned edits.
- `/api/v1/compiler/compile`, `/compilations/:id/*`: compile, translate retry, and save.
- `/api/v1/settings/*`: translation configuration and connection test.
- `/api/v1/exports`: create and download a backup archive.

## Security and Scope

Translation secrets are stored in Windows Credential Manager, never in SQLite or exported ZIP files. The current product is single-user and local-only; authentication, remote sync, and multi-user authorization are intentionally outside V1.
