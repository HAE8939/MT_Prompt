# Changelog

## 2026-08-11 - V1.1-V1.4 development checkpoint

- Added ZIP backup validation with schema, required-entry, path, size, and SHA-256 checks.
- Added read-only asset integrity scanning for missing and orphan files.
- Added server pagination and Prompt sorting/filter query support.
- Added immutable Prompt version restore that creates a new history entry.
- Added ordered compiler contribution snapshots and generator provenance display.
- Added a generic OpenAI-compatible AI Provider, Credential Manager configuration, and optimize/variant/consistency/rewrite proposal APIs.
- Configured the local Provider for `https://lanfengai.cn` and `deepseek-v4-flash`; the upstream chat endpoint currently times out while `/v1/models` remains reachable.
- Added transactional MERGE/REPLACE restore with pre-restore backup gating and asset rollback journal.
- Added advanced Prompt workflows: exact-ID bulk updates, normalized duplicate reports, recycle-bin restore, version Diff, and compilation replay.
- Added video asset upload/preview support and template field defaults/conditional validation.
- Added explicit AI proposal acceptance as a new Prompt version; Provider timeout remains intentionally deferred for user-configurable replacement.

## 2026-08-11

- Added Prompt create/edit, category filtering, docked details, cover rendering, and version history.
- Imported and preserved the 50-record Ciyuan Prompt collection with local image assets.
- Added asset upload, content serving, role selection, and deletion.
- Added deterministic template/Skill/personal-rule compilation with Chinese and English output.
- Added OpenAI and Microsoft translation providers, retry state, and Windows Credential Manager storage.
- Added saving compilation results to the Prompt library with complete provenance.
- Added user-owned editing for templates, Skills, and personal rules while protecting built-in knowledge.
- Added ZIP export for Prompt metadata, knowledge, versions, and asset files.
- Added four Chrome E2E acceptance workflows for library create, asset lifecycle, translation fallback, and provenance.
- Fixed asset deletion requests by omitting JSON content headers when a request has no body.

## 2026-08-09

- Initialized the npm workspaces, Fastify API, React/Vite web app, shared contracts, compiler package, Prisma schema, and seed catalog.
- Added the approved V1 product specification, implementation plan, and preserved reference documentation.
