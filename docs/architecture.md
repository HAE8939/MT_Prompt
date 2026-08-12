# MT-Prompt 架构

## 运行边界

MT-Prompt 采用“无状态服务 + 浏览器 Vault”结构。Docker 中的 Fastify 只提供 Web 静态文件、`/health` 和 `/api/provider/chat/completions`。它不提供 Prompt、素材、知识库或设置的 CRUD 接口。

| 层 | 技术 | 职责 | 是否保存用户数据 |
| --- | --- | --- | --- |
| 浏览器 | React、IndexedDB、Web Crypto | Prompt、素材、版本、知识、设置、生成与导入导出 | 是，仅当前浏览器 |
| 容器 | Fastify、静态文件 | 页面交付、健康检查、受限 Provider 转发 | 否 |
| `.prompt` | 标准 ZIP、SHA-256 | 用户主动分享或迁移资产 | 由用户管理 |

## 主要流程

1. 首次访问时创建 `mt-prompt-vault` 并幂等写入十条内置 Prompt。
2. 库、编辑器、生成器和知识页面直接通过仓库接口访问 IndexedDB。
3. 基础双语生成在浏览器内完成，不依赖 Provider。
4. 用户明确请求 Provider 功能时，浏览器把本次地址、模型、密钥和消息发送给同源代理；代理校验公网 HTTPS 目标并转发，不落盘。
5. 导出在浏览器中生成 `.prompt`；导入先校验 ZIP 路径、清单、媒体类型、摘要和 Provider 禁区，再用跨 Store 事务写入。

## 安全边界

- 生产 API 不注册旧 `/api/v1/*` 用户数据路由。
- Provider 代理拒绝私网、本机目标和重定向，并限制请求体、超时及响应大小。
- Provider 配置和请求内容不写日志、不写容器文件。
- Compose 无数据卷，容器以非 root 用户和只读文件系统运行。
- `database/`、`storage/`、`prisma/` 仅为旧版本迁移资料。
