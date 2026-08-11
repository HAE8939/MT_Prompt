# you asked

message time: 2026-08-09 15:55:49

继续

---

# chatgpt response

好，我们继续推进。

现在进入 **前端页面组件设计阶段**。

这一部分非常适合给 Codex，因为 AI 写 React 最大的问题不是不会写，而是：

> 没有明确组件边界，最后容易生成一堆耦合代码。

所以我们提前定义：

- 页面有哪些
- 组件如何拆分
- 数据如何流动
- UI规范是什么

---

# Prompt Vault 前端设计原则

先确定几个原则。

## 1. 图片优先

所有页面围绕：

```
图片
 ↓
Prompt
 ↓
参数
```

而不是：

```
Prompt文字
 ↓
图片
```

---

## 2. 组件可复用

例如：

Prompt卡片：

首页用。

Prompt库用。

搜索结果用。

都应该是同一个组件。

---

## 3. 第一版不要过度状态管理

不要上：

Redux

MobX

复杂架构。

V1：

使用：

```
React Query
+
React Hooks
```

足够。

---

# 一、前端目录调整

最终：

```
frontend/src/


├── pages/
│
│   ├── Library/
│   │   └── index.tsx
│   │
│   ├── PromptDetail/
│   │   └── index.tsx
│   │
│   ├── Generator/
│   │   └── index.tsx
│   │
│   └── Settings/
│       └── index.tsx
│


├── components/


│   ├── layout/
│   │
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── MainLayout.tsx
│   │


│   ├── prompt/
│   │
│   │   ├── PromptCard.tsx
│   │   ├── PromptGrid.tsx
│   │   ├── PromptInfo.tsx
│   │   └── PromptActions.tsx
│   │


│   ├── media/
│   │
│   │   ├── ImageViewer.tsx
│   │   ├── ImageUpload.tsx
│   │   └── ImageGallery.tsx
│   │


│   ├── common/
│       ├── SearchBar.tsx
│       ├── Tag.tsx
│       └── Button.tsx


├── hooks/

├── api/

├── types/

└── utils/

```

---

# 二、页面设计

## 页面1：Prompt库（核心页面）

路径：

```
/library
```

---

结构：

```
Library Page


MainLayout

 ├── Sidebar

 └── Content


       Header

       SearchBar


       FilterBar


       PromptGrid


             PromptCard

             PromptCard

             PromptCard

```

---

视觉：

```
┌──────────────────────────────┐
│ 🔍 搜索Prompt                 │
├──────────────────────────────┤


  全部  图片  视频  修改


┌──────┐ ┌──────┐ ┌──────┐
│图片  │ │图片  │ │图片  │
│      │ │      │ │      │
│标题  │ │标题  │ │标题  │
└──────┘ └──────┘ └──────┘


```

---

# 三、PromptCard组件设计

这是最重要组件。

文件：

```
PromptCard.tsx
```

---

Props：

```ts
interface PromptCardProps {

id:string;

title:string;

cover:string;

model:string;

tags:string[];

rating:number;

status:string;

}

```

---

展示：

```
┌───────────────┐
│               │
│               │
│    Cover      │
│               │
├───────────────┤

现代东方豪宅

GPT-IMAGE 2


#室内
#建筑摄影


★★★★★

🟢 已验证

└───────────────┘

```

---

点击：

跳转：

```
/prompt/:id
```

---

# 四、Prompt详情页

路径：

```
/prompt/:id
```

---

布局：

左右结构。

---

左：

ImageGallery

```
┌────────────┐
│            │
│            │
│   图片     │
│            │
└────────────┘


Cover
Reference
Result

```

---

右：

PromptInfo


```
标题

模型

类型

标签


Prompt内容


复制按钮


编辑按钮

```

---

组件：

```
PromptDetail


├── ImageGallery

├── PromptInfo

├── PromptContent

└── PromptActions

```

---

# 五、Prompt生成器页面

路径：

```
/generator
```

---

设计不要复杂。

类似 ChatGPT。

---

结构：

```
Generator


任务类型


[图片生成]
[图片修改]


需求输入框


----------------


高级设置


模型

比例

风格


----------------


生成按钮



结果区域

Prompt Preview

```

---

组件：

```
GeneratorForm

GeneratorResult

ModelSelector

```

---

# 六、设置页面

路径：

```
/settings
```

简单。

---

内容：

```
AI设置

默认模型


存储设置

图片目录


系统

主题


备份

```

---

# 七、全局Layout

所有页面共享：

```
MainLayout

|
├── Sidebar
|
└── Content

```

---

Sidebar：

最终：

```
Prompt Vault


📚 Prompt库


✨ Prompt生成器


────────


分类

🖼 图片

🎬 视频

✏ 修改


────────


⚙ 设置

```

---

# 八、UI设计规范

这个给 Codex 非常重要。

---

## 主题

Dark Mode。


背景：

```
#0f0f0f
```

---

卡片：

```
#181818
```

---

文字：

主：

```
#FFFFFF
```

辅助：

```
#999999
```

---

强调色：

建议：

青绿色。

因为 AI + 创作感。

---

## 圆角

统一：

```
12px
```

---

## 图片

卡片：

比例：

```
16:9
```

圆角：

```
10px
```

---

# 九、前端数据流程

例如打开Prompt库：

```
Library.tsx

↓

usePrompts()

↓

GET /api/prompts

↓

返回数据

↓

PromptGrid

↓

PromptCard

```

---

点击：

```
PromptCard

↓

navigate()

↓

PromptDetail

↓

GET /api/prompts/:id

```

---

# 十、给 Codex 的前端开发任务

第一阶段：

不要让它一次写全部。

Prompt：

```
请实现 Prompt Vault 前端基础框架。

要求：

React + TypeScript

Tailwind CSS

实现：

1. MainLayout
2. Sidebar
3. Library页面
4. PromptCard组件


暂时使用mock数据。

不要连接API。

严格按照组件设计。
```

---

第二阶段：

接API。

---

第三阶段：

图片上传。

---

到这里，我们已经把：

✅ 产品定位  
✅ UI原型  
✅ 数据库  
✅ API  
✅ 前端组件  

全部确定。

下一步其实就是最后一个关键设计：

**Prompt生成器到底怎么设计规则系统。**

因为你最开始提出的第二个核心功能：

> “根据设定的规则，生成Prompt”

这个如果设计不好，会变成普通聊天框；设计好了，才是你的工具真正的差异化。

下一步我们可以专门设计：

**Prompt生成器 V1 的规则引擎结构。**

---
Powered by [AI Exporter](https://saveai.net)