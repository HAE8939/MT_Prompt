# you asked

message time: 2026-08-09 15:54:52

继续

---

# chatgpt response

好，我们继续推进到 **API 设计阶段**。

这一步的目的：

> 明确前端和后端如何沟通，让 Codex 写代码时不会自己猜。

我们按照 V1 的范围设计：

核心：

```
Prompt库
+
Prompt卡片
+
图片管理
+
搜索
+
标签
+
Prompt生成器（先预留）
```

---

# 一、API整体结构

采用 REST API：

基础地址：

```
http://localhost:3000/api
```

结构：

```
/api

├── prompts        Prompt管理
│
├── assets         图片管理
│
├── tags           标签管理
│
├── categories     分类管理
│
├── models         AI模型管理
│
└── generator      Prompt生成器
```

---

# 二、Prompt API（核心）

## 1. 获取Prompt列表

用途：

Prompt库页面加载卡片。

---

请求：

```
GET /api/prompts
```

支持参数：

```
?page=1
&limit=20
&keyword=豪宅
&type=IMAGE_EDIT
&tag=室内设计
```

---

返回：

```json
{
 "data":[
   {
    "id":"001",

    "title":"现代东方豪宅客厅V3",

    "cover":
    "/storage/images/cover/001.jpg",

    "model":
    "GPT-IMAGE 2",

    "type":
    "IMAGE_EDIT",

    "tags":[
      "室内设计",
      "建筑摄影"
    ],

    "rating":5
   }
 ],

 "total":120
}
```

---

这个直接对应：

你的瀑布流卡片。

---

# 2. 获取单个Prompt详情

点击卡片。

---

请求：

```
GET /api/prompts/:id
```

---

返回：

```json
{
"id":"001",

"title":
"现代东方豪宅客厅V3",


"description":
"商业室内摄影风格",


"content":

"Use the provided image as primary reference...",


"type":
"IMAGE_EDIT",


"model":
{
"name":
"GPT-IMAGE 2"
},


"assets":[

{
"type":
"COVER",

"url":
"/images/a.jpg"
},

{
"type":
"REFERENCE",

"url":
"/images/b.jpg"
},

{
"type":
"RESULT",

"url":
"/images/c.jpg"
}

],


"tags":[
"室内",
"豪宅"
]

}
```

---

对应详情页：

左边图片。

右边Prompt。

---

# 3. 创建Prompt

新建卡片。

---

请求：

```
POST /api/prompts
```

Body:

```json
{

"title":
"现代东方豪宅客厅V3",


"description":
"暖灰色调建筑摄影",


"content":
"xxxx",


"type":
"IMAGE_GENERATE",


"modelId":
"gpt-image-2",


"categoryId":
"interior"

}
```

---

返回：

```json
{
"id":"new-id",

"message":
"created"

}
```

---

# 4. 修改Prompt

编辑。

---

```
PUT /api/prompts/:id
```

---

例如：

修改：

标题

Prompt内容

评分

---

# 5. 删除Prompt

```
DELETE /api/prompts/:id
```

---

注意：

删除时：

应该：

数据库删除

+

关联图片删除

---

# 三、图片上传 API

这是本地存储核心。

---

## 上传图片

```
POST /api/assets/upload
```

FormData：

```
file:
image.jpg


type:
COVER


promptId:
001
```

---

后端：

保存：

```
storage/images/cover/
```

生成：

```json
{
"url":

"/storage/images/cover/a123.jpg"
}
```

---

# 图片目录规则

建议：

不要全部堆一个文件夹。

采用：

```
storage/images

├── 2026

│
├── 08

│
├── cover

│
└── reference

```

例如：

```
storage/images/2026/08/cover/a123.jpg
```

以后图片多也不会乱。

---

# 四、标签 API

## 获取标签

```
GET /api/tags
```

返回：

```json
[
{
"id":"1",
"name":"室内设计",
"count":32
}
]
```

---

## 创建标签

```
POST /api/tags
```

---

## 给Prompt添加标签

```
POST /api/prompts/:id/tags
```

Body:

```json
{
"tagIds":[
"1",
"2"
]
}
```

---

# 五、分类 API

例如：

侧边栏：

图片生成

视频生成

---

获取：

```
GET /api/categories
```

返回：

```json
[
{
"name":
"图片生成",

"children":[

"室内设计",

"产品摄影"

]

}
]
```

---

# 六、模型 API

主要用于筛选。

---

```
GET /api/models
```

返回：

```json
[
{
"name":
"GPT-IMAGE 2",

"type":
"IMAGE"
},

{
"name":
"VEO",

"type":
"VIDEO"
}

]
```

---

# 七、搜索 API

这个很重要。

---

第一版：

普通搜索即可。

```
GET /api/search?q=豪宅
```

搜索：

字段：

```
title

description

prompt内容

tags

model

```

---

以后：

升级 AI 搜索。

例如：

输入：

> 找适合现代豪宅的暖灰色摄影Prompt

变成：

Embedding搜索。

但是 V1 不做。

---

# 八、Prompt生成器 API（预留）

第一版：

先做模板拼接。

---

接口：

```
POST /api/generator/create
```

输入：

```json
{

"model":
"GPT-IMAGE 2",

"type":
"IMAGE_EDIT",


"requirements":

"把客厅改成夜景"

}
```

---

返回：

```json
{
"prompt":

"Use the provided image..."

}
```

---

后期：

这里替换成：

GPT API。

前端不用改。

---

# 九、最终 API 清单

Codex 开发时：

给它这个：

```
Prompt API

GET    /prompts
GET    /prompts/:id
POST   /prompts
PUT    /prompts/:id
DELETE /prompts/:id


Asset API

POST   /assets/upload
DELETE /assets/:id


Tag API

GET    /tags
POST   /tags


Category API

GET    /categories


Model API

GET    /models


Generator API

POST   /generator/create

```

---

# 十、现在项目已经有：

✅ 产品定位  
✅ UI原型  
✅ 数据库设计  
✅ 文件存储方案  
✅ API设计  

这已经接近一个完整 PRD 了。

下一步我建议做：

**《Prompt Vault 前端页面组件设计》**

也就是告诉 Codex：

- PromptCard 怎么拆
- 页面怎么组合
- 状态怎么管理
- UI组件有哪些

这样它生成 React 代码会稳定很多。你现在已经进入真正开发准备阶段。

---
Powered by [AI Exporter](https://saveai.net)