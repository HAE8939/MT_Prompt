# you asked

message time: 2026-08-09 15:53:25

继续

---

# chatgpt response

好，那我们继续往“可以直接交给 Codex 开始开发”的方向推进。

这一阶段我们要确定两个东西：

1. **项目目录结构**
2. **数据库 Schema（Prisma）**

目标：

> Codex 拿到后，不需要猜架构，直接搭建。

---

# 一、Prompt Vault V1 技术架构

最终确定：

```
Prompt Vault
│
├── 前端
│   React + TypeScript
│   Tailwind CSS
│   shadcn/ui
│
├── 后端
│   Node.js
│   Fastify
│
├── ORM
│   Prisma
│
├── 数据库
│   SQLite
│
└── 文件存储
    Local Storage
```

结构：

```
Browser

   ↓

React Frontend

   ↓ API

Node Backend

   ↓

Prisma

   ↓

SQLite


        +
        
storage/images

```

---

# 二、项目目录结构

建议：

```
PromptVault/

│
├── frontend/
│
│   ├── src/
│   │
│   │   ├── pages/
│   │   │
│   │   │   ├── Library.tsx
│   │   │   ├── PromptDetail.tsx
│   │   │   ├── Generator.tsx
│   │   │   └── Settings.tsx
│   │   │
│   │   ├── components/
│   │   │
│   │   │   ├── PromptCard.tsx
│   │   │   ├── ImageGallery.tsx
│   │   │   ├── Tag.tsx
│   │   │   └── SearchBar.tsx
│   │   │
│   │   ├── hooks/
│   │   │
│   │   └── utils/
│   │
│   └── package.json
│
│
├── backend/
│
│   ├── src/
│   │
│   │   ├── routes/
│   │   │
│   │   │   ├── prompts.ts
│   │   │   ├── assets.ts
│   │   │   ├── tags.ts
│   │   │
│   │   ├── services/
│   │   │
│   │   │   └── storageService.ts
│   │   │
│   │   ├── prisma/
│   │   │
│   │   │   └── schema.prisma
│   │   │
│   │   └── server.ts
│   │
│   └── package.json
│
│
├── storage/
│
│   ├── images/
│   │
│   │   ├── cover/
│   │   ├── reference/
│   │   └── result/
│
│
├── backups/
│
├── docs/
│
│   └── design.md
│
├── .gitignore
│
└── README.md

```

---

# 三、数据库设计

V1只需要：

6张表。

不要一开始搞复杂。

---

# 1. Prompt 主表

## Prompt

对应：

“一张Prompt卡片”

Prisma：

```prisma
model Prompt {

  id String @id @default(uuid())

  title String

  description String?


  content String


  type PromptType


  rating Int @default(0)


  status PromptStatus
  

  modelId String?


  categoryId String?


  createdAt DateTime @default(now())

  updatedAt DateTime @updatedAt


  assets Asset[]

  tags PromptTag[]


  model Model? @relation(fields:[modelId], references:[id])

  category Category? @relation(fields:[categoryId], references:[id])

}
```

---

字段解释：

例如：

```
title:

现代东方豪宅客厅 V3


content:

Use provided image as reference...


type:

IMAGE_EDIT


rating:

5


status:

VERIFIED

```

---

# 2. 图片资源表

Asset

负责：

封面图 / 参考图 / 结果图。

```prisma
model Asset {


id String @id @default(uuid())


promptId String


type AssetType


path String


width Int?

height Int?


createdAt DateTime @default(now())


prompt Prompt @relation(
fields:[promptId],
references:[id],
onDelete:Cascade
)

}
```

---

类型：

```prisma
enum AssetType {

 COVER

 REFERENCE

 RESULT

 COMPARISON

}

```

---

# 3. 标签表

Tag

```prisma
model Tag {

id String @id @default(uuid())


name String @unique


prompts PromptTag[]

}
```

---

关联：

```prisma
model PromptTag {


promptId String

tagId String


prompt Prompt @relation(
fields:[promptId],
references:[id]
)


tag Tag @relation(
fields:[tagId],
references:[id]
)


@@id([
promptId,
tagId
])

}
```

---

# 4. 分类表

Category

例如：

```
图片生成

   室内设计

   产品摄影

```

结构：

```prisma
model Category {

id String @id @default(uuid())


name String


parentId String?


children Category[]
}

```

---

# 5. AI模型表

Model


```prisma
model Model {


id String @id @default(uuid())


name String


provider String


type String


prompts Prompt[]

}

```

---

数据：

```
GPT-IMAGE 2

OpenAI

IMAGE


VEO

Google

VIDEO

```

---

# 6. Prompt版本（预留）

暂时建立。

不用开发。

```prisma
model PromptVersion {


id String @id @default(uuid())


promptId String


version Int


content String


note String?


createdAt DateTime @default(now())


}

```

---

# 四、枚举定义

```prisma
enum PromptType {


IMAGE_GENERATE

IMAGE_EDIT

VIDEO_GENERATE

TEXT

AGENT

}


enum PromptStatus {


EXPERIMENT

VERIFIED

FAVORITE

}

```

---

# 五、第一版数据流

例如：

你添加一个Prompt：

---

上传：

```
豪宅.jpg
```

↓

创建：

Prompt

↓

保存：

```json
{
"title":
"现代东方豪宅客厅",

"type":
"IMAGE_GENERATE",

"content":
"xxxx"

}

```

↓

图片：

```
storage/images/cover/a123.jpg

```

↓

数据库：

```
Asset.path

```

---

页面显示：

PromptCard 自动读取：

```
Prompt

+
Cover Asset

+
Tags

+
Model

```

---

# 六、给 Codex 的第一阶段任务

不要让它直接开发全部。

第一条指令应该：

---

```
你是一名高级全栈工程师。

请创建一个本地Web应用：

项目名：
Prompt Vault


目标：

管理AI提示词资产。


技术：

Frontend:
React + TypeScript + Tailwind

Backend:
Node.js + Fastify

Database:
SQLite + Prisma


第一阶段：

只完成：

1. 项目目录结构
2. Prisma数据库
3. 基础API
4. 前端路由


不要开发复杂UI。

严格按照架构设计。
```

---

这样 Codex 会比较稳定。

---

下一步我们可以继续设计：

**Prompt Vault 的 API 接口设计**

例如：

```
GET /prompts

POST /prompts

GET /prompts/:id

POST /assets/upload

```

这个完成以后，Codex 基本就能开始写后端了。你现在的设计已经接近一个正式项目的规格了。

---
Powered by [AI Exporter](https://saveai.net)