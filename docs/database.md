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
| `Asset` | Image/video metadata linked to a Prompt; bytes live in `storage/` |
| `Model`, `ModelTask` | Provider/model catalog and supported task definitions |
| `PromptTemplate` | Versioned bilingual template for one model task |
| `PromptSkill` | Reusable bilingual compiler contribution with priority/conflict metadata |
| `PersonalRule` | Optional user constraint applied globally or to one task |
| `CompilationRun` | Inputs, output, translation state, and compiler provenance |

`Prompt.compilationRunId` is unique, so one compilation can create at most one Prompt. Prompt deletion sets `deletedAt` for recycle-bin recovery; explicit purge remains the only destructive operation.

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

The export ZIP includes Prompts, versions, knowledge, taxonomy, asset bytes, checksums, and missing-asset reporting. Windows Credential Manager secrets are excluded. Import supports a dry-run preview plus MERGE and REPLACE modes. REPLACE always creates an automatic pre-restore export and fails closed if that export cannot be written.

Before a schema migration, start the API and run `Invoke-RestMethod -Method Post http://127.0.0.1:3000/api/v1/exports`, then verify the downloaded ZIP. Apply Prisma changes with `npx prisma migrate deploy` in packaged environments; local development may use `npx prisma db push --skip-generate`.
