# MT-Prompt

[中文](#中文) | [English](#english)

## 中文

MT-Prompt 是一个轻量的局域网 Prompt 工作台。程序负责管理、生成和分享提示词；用户的 Prompt、图片、视频、模板、Skill、界面设置及 Provider 配置均保存在访问设备的浏览器 IndexedDB 中，不写入 Docker 容器。

### 核心能力

- Prompt 库：搜索、图片/视频/收藏筛选、列表/网格视图、详情和编辑。
- 素材管理：为 Prompt 添加或删除 PNG、JPEG、WebP、GIF、MP4、WebM 素材。
- 本地生成器：中文填写需求，在浏览器内生成中文与英文 Prompt。
- 模板与技能：模板、Skill、规则均保存在当前浏览器 Vault。
- `.prompt` 分享：标准 ZIP 容器，可包含 Prompt 及关联图片/视频，也可选择包含界面设置或完整知识库。
- 通用 Provider：仅在用户明确操作时通过无状态代理请求 OpenAI-compatible Provider。

### Docker 部署

```bash
docker compose up -d --build
```

访问 `http://服务器局域网IP:3000`。可在 `.env` 中设置 `MT_PROMPT_PORT` 更换宿主机端口。健康检查地址为 `/health`。Compose 不声明数据卷，容器文件系统只读。

### 数据与跨设备

每个浏览器配置文件拥有独立的 `mt-prompt-vault` IndexedDB。重新创建 Docker 容器不会删除浏览器数据，但换电脑、换浏览器或清除站点数据不会自动同步。跨设备迁移请从 Prompt 库导出 `.prompt`，再在目标设备导入。

`.prompt` 永远不包含 Provider 地址、模型、密钥或等价配置字段。Provider 配置只保存在当前浏览器；共享设备上的其他浏览器配置文件看不到这些数据。浏览器站点数据并不等同于操作系统凭据保险箱，公共设备使用后应清除 Provider。

项目中的 `database/`、`storage/`、`prisma/` 和旧 API 模块仅作为早期版本迁移与审计资料保留，不属于当前生产运行边界。

### 本地开发

```bash
npm install
npm run dev
```

Web 默认运行于 `http://127.0.0.1:5173`，API 默认运行于 `http://127.0.0.1:3000`。

```bash
npm test
npm run verify
```

`npm run verify` 依次执行单元测试、生产边界测试、类型检查、Web 生产构建和 Chrome E2E。GitHub Actions 会在 `main` 推送和 Pull Request 上执行相同门禁，并额外构建 Docker 镜像、检查容器健康状态。

## English

MT-Prompt is a lightweight LAN workbench for managing, generating, and sharing bilingual prompts. Prompts, media, knowledge, UI preferences, and Provider configuration live in each device's browser IndexedDB; Docker stores no user data.

Deploy with `docker compose up -d --build`, then open `http://LAN_SERVER_IP:3000`. Each browser profile has an independent Vault and there is no automatic cross-device sync. Use standard ZIP-based `.prompt` packages to transfer Prompts and associated media. Packages may optionally include interface settings or the full knowledge library, but never Provider URL, model, key, or aliases.

For development, run `npm install` and `npm run dev`. See [architecture](docs/architecture.md) and [data storage](docs/database.md) for the current runtime boundary.
