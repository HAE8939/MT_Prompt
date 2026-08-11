# Database and Local Data

## Storage Layout

- `database/promptvault.db`: SQLite database selected by `DATABASE_URL`.
- `storage/images/YYYY/MM/<role>/`: uploaded Prompt images.
- `exports/`: generated backup ZIP files.
- `data/imports/ciyuan01/`: normalized source data for the explicit Ciyuan import.

Runtime directories and databases are ignored by Git. `npm run setup` creates required paths, generates Prisma Client, syncs the schema, and idempotently seeds built-in knowledge.

## Core Entities

| Entity | Role |
| --- | --- |
| `Prompt` | User-facing bilingual Prompt record and current state |
| `PromptVersion` | Immutable snapshots created on initial save and update |
| `Asset` | Image metadata linked to a Prompt; bytes live in `storage/` |
| `Model`, `ModelTask` | Provider/model catalog and supported task definitions |
| `PromptTemplate` | Versioned bilingual template for one model task |
| `PromptSkill` | Reusable bilingual compiler contribution with priority/conflict metadata |
| `PersonalRule` | Optional user constraint applied globally or to one task |
| `CompilationRun` | Inputs, output, translation state, and compiler provenance |

`Prompt.compilationRunId` is unique, so one compilation can create at most one Prompt. Prompt deletion cascades to its versions and assets; the linked compilation is retained with its Prompt link cleared.

## Ownership and Editing

Knowledge records use `BUILT_IN` or `USER` ownership. Editing built-in templates, Skills, or rules creates a user-owned copy instead of overwriting seeded source knowledge. User-owned records can be updated or deleted through the knowledge API.

## Data Safety Rules

- Prompt create/update and version creation run in Prisma transactions.
- Compilation save is idempotent and transactional.
- Asset storage keys are normalized and constrained below the storage root.
- Asset upload compensates by deleting the new file when metadata creation fails.
- Tests and scripts must delete only records created under exact IDs; broad `deleteMany()` cleanup is prohibited for development data.
- `npm run import:ciyuan01` is idempotent and must not remove existing Prompts.

## Backup Boundary

The export ZIP includes Prompts, versions, knowledge, taxonomy, asset bytes, checksums, and missing-asset reporting. Windows Credential Manager secrets are excluded. V1 provides export/download; automatic restore from an archive is not implemented yet.

V1.1 adds strict archive validation and read-only integrity reporting. Applying validated archives in merge/replace modes remains under development; validation does not mutate SQLite or local assets.
