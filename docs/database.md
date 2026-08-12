# 浏览器 Vault 与数据存储

## 当前数据位置

生产版本不使用服务端数据库。每个浏览器配置文件在站点源下保存一个名为 `mt-prompt-vault` 的 IndexedDB，包含以下 Object Store：

| Store | 内容 |
| --- | --- |
| `prompts` | 中英双语 Prompt、分类、标签、收藏和来源 |
| `assets` | 与 Prompt 关联的图片、视频 Blob 及 SHA-256 |
| `versions` | Prompt 历史快照 |
| `knowledge` | Template、Skill、Rule |
| `settings` | Provider 配置和界面偏好，分键保存 |
| `meta` | 初始化版本和导入记录 |

## 持久性与隔离

- 数据属于“协议 + 主机 + 端口 + 浏览器配置文件”。更换其中任一项通常会得到一个新 Vault。
- 更新或重建 Docker 容器不会影响原地址下的浏览器 Vault。
- 清除站点数据、浏览器重置或设备损坏会删除本地 Vault，应定期导出 `.prompt`。
- 不同设备和不同浏览器配置文件不会自动同步，也不会互相看到数据。

## `.prompt` 边界

`.prompt` 是标准 ZIP，包含版本化 manifest、JSON 元数据、素材字节和 SHA-256。它可包含选中的 Prompt、关联媒体、版本来源，并可选择包含界面设置或完整知识库。无论选择什么范围，Provider 地址、模型、密钥及其别名都必须被拒绝。

导入不会静默覆盖本地 Prompt：完全重复项跳过，ID 冲突创建副本；素材与元数据在同一 IndexedDB 事务中写入。

## 历史数据

仓库内的 SQLite、`storage/`、Prisma Schema 和导入脚本来自早期 PromptVault 版本，仅为迁移、比对和恢复保留。当前 Docker 镜像不复制这些目录，也不需要数据库卷。
