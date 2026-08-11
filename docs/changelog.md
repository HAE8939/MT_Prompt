# Changelog

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
