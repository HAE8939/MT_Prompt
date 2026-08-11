# you asked

message time: 2026-08-09 15:35:47

可以

---

# chatgpt response

好，那我们开始设计 **Prompt Vault 的数据结构**。

这一步其实非常关键，因为 UI 只是“看到东西”，数据库结构决定了以后：

- 搜索是否好用
- Prompt能不能复用
- AI生成器能不能调用历史资产
- 能不能做版本管理
- 能不能自动分析图片生成Prompt

我会按照我们确定的 V1 产品方向设计，不做过度复杂化。

---

# Prompt Vault 核心数据模型

整体关系：

```
Prompt Vault

├── Prompt卡片（核心）
│
├── 图片资源
│
├── 标签系统
│
├── 模型配置
│
├── 分类系统
│
└── 版本记录（预留）
```

---

# 一、Prompt表（核心）

这是最重要的一张表。

对应：

> 一张 Prompt 卡片

例如：

“现代东方豪宅客厅 V3”

---

## prompts

| 字段 | 类型 | 说明 |
|-|-|-|
| id | 主键 | 唯一编号 |
| title | 文本 | Prompt名称 |
| description | 文本 | 简短说明 |
| prompt_text | 长文本 | 核心Prompt |
| negative_prompt | 长文本 | 负面Prompt |
| task_type | 分类 | 生成/修改/视频 |
| model_id | 外键 | 使用模型 |
| category_id | 外键 | 所属分类 |
| rating | 数字 | 评分 |
| status | 状态 | 已验证/实验 |
| created_at | 时间 | 创建时间 |
| updated_at | 时间 | 修改时间 |

---

例如：

```json
{
"title":
"现代东方豪宅客厅V3",

"task_type":
"image_edit",

"model":
"GPT-IMAGE 2",

"rating":
5,

"status":
"verified"
}
```

---

# 二、图片资源表（非常重要）

不要把图片直接塞Prompt表。

因为一个Prompt可能有：

- 封面图
- 参考图
- 结果图
- 多版本效果图


所以单独：

## assets

---

|字段|说明|
|-|-|
|id|图片编号|
|prompt_id|属于哪个Prompt|
|type|图片类型|
|path|本地路径|
|width|宽|
|height|高|
|created_at|时间|

---

type：

例如：

```
cover

reference

result

comparison
```

---

关系：

```
Prompt

↓

图片资源

├── cover.jpg

├── before.jpg

└── after.jpg

```

---

这对应你以后最需要的：

参考图 → Prompt → 结果图

---

# 三、标签表

不要直接写：

```
#室内 #豪宅
```

因为以后搜索不好。

---

## tags

字段：

|字段|说明|
|-|-|
|id||
|name||
|type||

---

例如：

```
标签：

室内设计

建筑摄影

暖灰色

自然光

GPT-IMAGE

```

---

然后：

## prompt_tags

关联表：

```
Prompt

↓

多个标签

```

---

例如：

一个Prompt：

拥有：

```
室内设计

豪宅

自然光

GPT-IMAGE

```

---

# 四、模型表

因为未来肯定不止 GPT-IMAGE。

所以：

## models


|字段|说明|
|-|-|
|name|模型名|
|company|厂商|
|type|图片/视频/文字|

---

数据：

```
GPT-IMAGE 2

OpenAI

Image


Midjourney V7

Midjourney

Image


VEO

Google

Video

```

---

以后筛选：

“只看GPT-IMAGE提示词”

直接过滤。

---

# 五、分类表

分类不要太细。

建议：

一级：

```
图片生成

图片修改

视频生成

文字生成

Agent
```

---

二级：

例如：

图片：

```
室内设计

人物摄影

产品摄影

建筑摄影

```

---

数据库：

categories


```
id

name

parent_id

```

支持无限层级。

---

# 六、Prompt参数表（非常建议）

这个是很多Prompt工具没有的。

但是你的场景非常需要。


因为：

同一个Prompt：

GPT-IMAGE：

和 Midjourney：

参数不同。


---

## prompt_settings


字段：

|字段|说明|
|-|-|
|prompt_id||
|aspect_ratio|比例|
|resolution|尺寸|
|camera|镜头|
|style|风格|
|seed|种子|

---

例如：

```
比例:
16:9


镜头:
24mm


摄影:
ARRI Alexa 65


风格:
建筑摄影

```

---

# 七、版本表（V2功能）

你的Prompt一定需要。


例如：

```
室内零漂移

V1
↓

V2
↓

V3

```

---

## prompt_versions


字段：

```
id

prompt_id

version

content

change_note

created_at

```

---

例如：

```
V3

增加：
禁止改变灯光

```

---

# 八、未来AI分析字段（预留）

以后：

上传一张图：

AI自动生成：

```
标题

标签

风格

Prompt

```

所以预留：

## ai_analysis


保存：

```
image_description

generated_prompt

visual_tags

confidence

```

---

# 最终数据库关系：

```
                 models
                    |
                    |
categories —— prompts —— assets
                    |
                    |
                  tags


                    |
              prompt_versions


                    |
              ai_analysis

```

---

# 对应你的 UI

刚才那个界面：

## 卡片

来自：

```
prompts

+
cover asset

+
tags

+
model

```

---

## 详情页

来自：

```
prompts

+

assets

+

settings

```

---

## 搜索

搜索：

```
title

prompt_text

tags

model

```

---

# 第一版实际只需要建立：

不要全部开发。

V1数据库：

只做：

```
prompts

assets

tags

categories

models

```

5张表。

已经可以支撑一个很好用的工具。

---

我觉得下一步可以继续设计：

**Prompt Vault 的文件目录结构 + 本地部署方案**

因为你选择的是本地 Web 应用，接下来要确定：

- 图片存哪里？
- 数据库放哪里？
- 项目文件怎么组织？
- 如何让 Cursor / Claude Code 开发？ 

这个会直接影响以后维护体验。

---
Powered by [AI Exporter](https://saveai.net)