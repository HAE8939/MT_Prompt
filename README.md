# PromptVault

PromptVault is a local Windows workbench for managing, compiling, and organizing bilingual AI image and video prompts.

## Development

```bash
npm install
npm run setup
npm run dev
```

The web app runs at `http://127.0.0.1:5173` and the API at `http://127.0.0.1:3000`.

## Commands

- `npm run setup`: prepare runtime directories, generate Prisma Client, sync the SQLite schema, and seed built-in knowledge.
- `npm run dev`: start the API and web app.
- `npm test`: run workspace tests.
- `npm run test:e2e`: run the four Chrome acceptance workflows.
- `npm run typecheck`: type-check all workspaces.
- `npm run import:ciyuan01`: idempotently import the bundled Ciyuan prompt collection.

## Structure

- `apps/api`: Fastify API and local asset storage adapter.
- `apps/web`: React/Vite workbench.
- `packages/contracts`: shared request and response contracts.
- `packages/compiler`: deterministic bilingual prompt compiler.
- `prisma`: schema, seed data, runtime setup, and import scripts.
- `docs/reference`: original Chinese product and architecture documents.
- `docs/assets`: design references and UI prototypes.
- `docs/superpowers`: approved specification and implementation plan.
- `data/imports`: source datasets used by explicit import commands.
- `database`, `storage`, `backups`, `exports`: ignored local runtime data.

## Documentation

- `docs/architecture.md`: runtime boundaries and request flow.
- `docs/database.md`: Prisma data model and local data safety.
- `docs/prompt-engine.md`: bilingual compilation and translation behavior.
- `docs/changelog.md`: implemented feature history.
