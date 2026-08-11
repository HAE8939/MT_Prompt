# you asked

message time: 2026-08-09 16:05:41

继续

---

# chatgpt response

好，我们继续设计 **Prompt Template（模板系统）**。

这里其实是 Prompt Engine 最后一块拼图。

前面三个概念：

```
Model Profile（模型规则）
        ↓
Task Rule（任务规则）
        ↓
Skill Library（技能库）
```

解决的是：

> “应该怎么写 Prompt”

而 Template 解决的是：

> “Prompt 的整体骨架是什么”

---

# 一、先明确：Skill 和 Template 的区别

这个非常重要。

很多 Prompt 工具会把两者混在一起。

我们分开：

---

## Skill = 能力模块

像“插件”。

例如：

```
Reference Lock

+
ARRI Alexa 65

+
Natural Material Preservation

```

它们可以复用到很多 Prompt。

---

## Template = 完整任务框架

例如：

```
GPT-IMAGE 2 豪宅室内修改模板


[参考图控制]

[空间描述]

[修改目标]

[光线要求]

[材质要求]

[摄影语言]

[禁止改变]

```

---

关系：

```
Template
    +
Skill
    +
User Input
    =
Final Prompt

```

---

# 二、Template 数据结构设计

新增：

## prompt_templates

Prisma：

```prisma
model PromptTemplate {

  id String @id @default(uuid())


  name String


  description String?


  modelId String


  taskType String


  industry String?


  structure Json


  templateContent String


  createdAt DateTime @default(now())


  updatedAt DateTime @updatedAt

}

```

---

解释：

---

## name

模板名称：

例如：

```
GPT-IMAGE 2 室内参考图修改模板
```

---

## modelId

绑定模型：

例如：

```
GPT-IMAGE 2
```

---

## taskType

任务：

例如：

```
IMAGE_EDIT
```

---

## industry

行业：

例如：

```
INTERIOR_DESIGN
```

---

## structure

Prompt结构定义。

例如：

```json
{
"sections":[

"reference",

"preservation",

"modification",

"lighting",

"camera",

"negative"

]

}

```

---

## templateContent

真正模板：

例如：

```
Use the provided image as the primary reference.

[REFERENCE]

Preserve:

[PRESERVATION]

Modification:

[MODIFICATION]

Lighting:

[LIGHTING]

Camera:

[CAMERA]

Negative constraints:

[NEGATIVE]

```

---

# 三、模板不是固定文本，而应该是变量系统

这是关键。

不要：

```
固定Prompt

```

应该：

```
Prompt骨架 + 参数槽位

```

---

例如：

GPT-IMAGE 室内修改模板：

```
Use the provided image as the only reference.


Reference Preservation:

{{preservation}}


Modification:

{{modification}}


Lighting:

{{lighting}}


Camera:

{{camera}}


Constraints:

{{negative}}

```

---

生成时：

替换变量。

---

# 四、Template Schema（模板字段定义）

每个模板应该告诉系统：

需要哪些输入。


例如：

GPT-IMAGE室内模板：

```json
{
"fields":[

{
"name":"modification",
"type":"textarea",
"label":"修改内容"
},

{
"name":"lighting",
"type":"select",
"options":[
"自然光",
"夜景",
"黄昏"
]
},

{
"name":"camera",
"type":"text"
}

]

}

```

---

这样前端生成器可以动态生成表单。

---

这非常重要。

因为：

不同模型：

字段不同。

---

# 五、举例：GPT-IMAGE 2 模板

## 模板名称

```
GPT-IMAGE 2
参考图零漂移修改
```

---

结构：

```
1.Reference Lock

2.Scene Preservation

3.Target Modification

4.Visual Enhancement

5.Camera Language

6.Negative Constraints

```

---

模板：

```
Use the provided image as the primary reference.

Do not change the original composition,
architecture,
camera angle,
or spatial layout.

Preserve:

{{preservation}}


Modify only:

{{modification}}


Lighting:

{{lighting}}


Visual style:

{{style}}


Camera:

{{camera}}


Do not:

{{negative}}

```

---

# 六、Nano Banana 2 模板

这个应该不同。

因为它更偏：

- 人物替换
- 多图融合
- 局部修改


模板：

```
Image editing task.

Reference images:

{{reference}}

Main subject:

{{subject}}

Change:

{{change}}

Maintain:

{{consistency}}

Avoid:

{{negative}}

```

---

# 七、Kling 3.0 视频模板

视频Prompt逻辑完全不同。

不要套图片。


结构：

```
Scene

Subject

Action

Camera Motion

Lighting

Duration

Mood

```

---

模板：

```
Cinematic video scene:

Scene:
{{scene}}


Subject movement:
{{motion}}


Camera movement:
{{camera_motion}}


Lighting:
{{lighting}}


Duration:
{{duration}}


Style:
{{style}}

```

---

# 八、Seedance 2.0 模板

更偏：

导演分镜。

结构：

```
Shot

Camera

Character

Action

Environment

Transition

Emotion

```

---

模板：

```
Shot description:

{{shot}}


Camera:

{{camera}}


Character action:

{{action}}


Environment:

{{environment}}


Transition:

{{transition}}

```

---

# 九、模板和 Skill 的关联

数据库：

增加：

## template_skills


关系：

```
Template

↓

Recommended Skills

```

---

例如：

GPT-IMAGE室内模板默认：

```
Reference Lock

Luxury Interior

Material Realism

ARRI Alexa

```

---

用户可以：

增加：

```
+ Golden Hour

+ Film Grain

```

---

# 十、Prompt生成器最终流程

现在完整了：

---

## Step 1

选择模型

```
GPT-IMAGE 2

Nano Banana 2

Kling 3.0

Seedance 2.0

```

↓

---

## Step 2

选择任务

例如：

GPT：

```
图片修改

```

↓

---

## Step 3

加载模板

```
GPT-IMAGE 室内修改模板

```

↓

---

## Step 4

选择技能

```
✓ Reference Lock

✓ Luxury Interior

✓ Natural Light

```

↓

---

## Step 5

填写需求

```
把白天改成蓝调夜景

```

↓

---

## Step 6

生成：

最终Prompt。

---

# 十一、最终 Prompt Engine 架构

现在完整：

```
                    用户需求

                       ↓


              Model Profile

                       ↓


              Task Rule

                       ↓


              Template

                       ↓


              Skill Library

                       ↓


           Personal Style Rules

                       ↓


              Prompt Compiler

                       ↓


             Final Prompt

```

---

这里有一个非常重要的新概念：

## Prompt Compiler（Prompt编译器）

我觉得这个名字非常适合。

因为它不是简单生成文字。

它是在：

- 选择规则
- 填充模板
- 注入技能
- 输出Prompt


这和代码编译很像。

---

# 十二、到这里 Prompt Vault 的产品架构基本成型

现在：

## 内容层

```
Prompt Library
```

保存成果。


## 知识层

```
Skill Library
Template Library
Model Rules
```

保存方法。


## 生成层

```
Prompt Compiler
```

生成新的Prompt。


---

我觉得下一步应该设计一个非常关键的东西：

**Prompt Compiler 的内部逻辑（生成算法）**

也就是：

当用户点击“生成Prompt”时，系统内部具体怎么组合：

Model + Task + Template + Skill + 用户输入。

这个设计好了，Codex 才能真正实现 Prompt 生成器，而不是简单字符串拼接。

---
Powered by [AI Exporter](https://saveai.net)