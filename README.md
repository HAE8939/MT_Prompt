# PromptVault

PromptVault 是一个面向 Windows 的本地 Prompt 工作台，用于管理、编译和整理中英双语的 AI 图片与视频 Prompt。

[English](#english) | [中文](#中文)

## 中文

### 项目简介

PromptVault 以本地 SQLite 和文件系统作为数据源，适合个人维护可复用的 Prompt、模板、Skill、个人规则和素材。用户可以用中文填写需求，编译器生成中文与英文 Prompt，并保留版本、来源和素材关联。

### 当前能力

- Prompt 库：搜索、分类、图片/视频/收藏筛选、分页、排序和高级筛选。
- Prompt 详情：双语内容、封面、图片与视频素材、版本历史和来源信息。
- 编辑与版本：修改 Prompt、恢复历史版本、比较版本差异、采纳 AI 建议为新版本。
- 生成器：模板字段校验、默认值、条件字段、Skill 冲突提示和编译来源展示。
- 数据安全：ZIP 备份、校验预览、MERGE/REPLACE 恢复、恢复前自动备份、资产完整性扫描和回滚保护。
- AI Provider：通用 OpenAI-compatible Provider，支持优化、变体、一致性检查和模型重写。
- 本地凭据：翻译服务与 AI Provider 密钥仅保存于 Windows Credential Manager，不写入 SQLite、日志或导出文件。
- 数据集：支持幂等导入 Ciyuan Prompt 集合，现有 50 条 Prompt 会被保留。

### 环境要求

- Windows
- Node.js 20 或更高版本
- npm

### 快速开始

```bash
npm install
npm run setup
npm run dev
```

启动后访问：

- Web：<http://127.0.0.1:5173>
- API：<http://127.0.0.1:3000>

首次使用建议先在“设置”中配置翻译服务和通用 AI Provider。Provider 的 Base URL、密钥和模型均可由用户自行替换；当前 Provider 的模型请求超时不会阻塞本地 Prompt 管理功能。

### 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run setup` | 创建运行目录、生成 Prisma Client、同步 SQLite Schema 并初始化内置知识 |
| `npm run dev` | 同时启动 API 和 Web |
| `npm test` | 运行所有工作区单元测试和组件测试 |
| `npm run test:e2e` | 运行 Chrome 验收流程 |
| `npm run typecheck` | 检查所有工作区的 TypeScript 类型 |
| `npm run import:ciyuan01` | 幂等导入 Ciyuan Prompt 集合 |

### 数据与备份

运行时数据默认位于以下目录：

- `database/`：SQLite 数据库
- `storage/`：本地素材文件
- `exports/`：导出的 ZIP 备份
- `backups/`：用户保留的备份文件

这些目录属于本地运行数据，不应提交到 Git。执行 Prisma Schema 迁移前，应先启动 API 并调用 `POST /api/v1/exports` 创建备份，再执行迁移或 `npx prisma db push --skip-generate`。

### 项目结构

- `apps/api`：Fastify API、业务服务和本地素材存储适配器
- `apps/web`：React/Vite 工作台界面
- `packages/contracts`：共享请求与响应契约
- `packages/compiler`：确定性的双语 Prompt 编译器
- `prisma`：数据库 Schema、种子数据和导入脚本
- `docs/reference`：原始中文产品与架构文档
- `docs/superpowers`：已批准的规格与实施计划

### 相关文档

- [`docs/architecture.md`](docs/architecture.md)：运行边界和请求流程
- [`docs/database.md`](docs/database.md)：Prisma 数据模型和本地数据安全
- [`docs/prompt-engine.md`](docs/prompt-engine.md)：双语编译与翻译行为
- [`docs/changelog.md`](docs/changelog.md)：功能变更记录

### 当前范围

PromptVault 当前是单用户、本地优先应用。桌面打包、云端同步、团队协作、账号体系和远程权限控制暂不属于当前版本范围。

## English

PromptVault is a local Windows workbench for managing, compiling, and organizing bilingual AI image and video prompts.

### Development

```bash
npm install
npm run setup
npm run dev
```

The web app runs at `http://127.0.0.1:5173` and the API at `http://127.0.0.1:3000`.

### Commands

- `npm run setup`: prepare runtime directories, generate Prisma Client, sync the SQLite schema, and seed built-in knowledge.
- `npm run dev`: start the API and web app.
- `npm test`: run workspace unit and component tests.
- `npm run test:e2e`: run the Chrome acceptance workflows.
- `npm run typecheck`: type-check all workspaces.
- `npm run import:ciyuan01`: idempotently import the Ciyuan prompt collection.

### Structure

- `apps/api`: Fastify API and local asset storage adapter.
- `apps/web`: React/Vite workbench.
- `packages/contracts`: shared request and response contracts.
- `packages/compiler`: deterministic bilingual prompt compiler.
- `prisma`: schema, seed data, runtime setup, and import scripts.
- `docs/reference`: original Chinese product and architecture documents.
- `docs/superpowers`: approved specification and implementation plan.

### Documentation

- `docs/architecture.md`: runtime boundaries and request flow.
- `docs/database.md`: Prisma data model and local data safety.
- `docs/prompt-engine.md`: bilingual compilation and translation behavior.
- `docs/changelog.md`: implemented feature history.
