# you asked

message time: 2026-08-09 16:06:29

继续

---

# chatgpt response

好，我们继续设计 **Prompt Compiler（Prompt编译器）内部逻辑**。

这一部分其实是整个 Prompt Vault 的“大脑”。

前面设计的是：

- 存什么（Prompt库）
- 用什么方法（Skill）
- 按什么格式写（Template）
- 遵循什么模型习惯（Model Rule）

现在要解决：

> 当用户点击「生成 Prompt」时，系统到底如何工作？

---

# 一、Prompt Compiler 的定位

先定义一句话：

> Prompt Compiler 是一个根据模型、任务、模板、技能和用户需求，动态组装并优化 Prompt 的规则执行引擎。

它不是 AI。

至少 V1 不是。

它更像：

```text
Prompt生成流水线
```

---

# 二、Compiler整体流程

整体：

```
用户输入
    |
    ↓
需求解析
    |
    ↓
模型规则加载
    |
    ↓
任务规则加载
    |
    ↓
模板加载
    |
    ↓
Skill注入
    |
    ↓
个人规则注入
    |
    ↓
Prompt排序
    |
    ↓
Prompt输出
```

---

# 三、第一步：用户输入解析

用户输入：

例如：

> 把白天的现代客厅改成蓝调夜景，保持家具、材质和空间结构不变，要有高级酒店摄影感觉。

Compiler首先拆解：

---

输入：

```json
{
"request":

"把白天客厅改成蓝调夜景..."
}
```

↓

解析：

```json
{
"intent":

"IMAGE_EDIT",


"objects":

[
"living room"
],


"action":

"lighting_change",


"constraints":

[
"keep furniture",
"keep structure"
]

}
```

---

注意：

V1 不一定需要 AI 解析。

可以：

人工字段 + AI辅助。

---

# 四、第二步：加载 Model Profile

用户选择：

GPT-IMAGE 2

加载：

```json
{
model:
"GPT-IMAGE 2",

capabilities:

[
"image_edit",
"reference_preserve"
]


}
```

---

告诉系统：

这个模型擅长：

- 参考图编辑
- 图像保持
- 局部修改

---

# 五、第三步：加载 Task Rule

任务：

图片修改。


加载：

```json
{
task:

"IMAGE_EDIT",


priority:

[
"reference",
"preservation",
"modification",
"negative"

]

}
```

---

这一步决定 Prompt 顺序。

---

# 六、第四步：选择 Template

加载：

GPT-IMAGE 2 室内修改模板。


模板：

```text
1. Reference

2. Preservation

3. Modification

4. Lighting

5. Camera

6. Negative

```

---

Compiler知道：

最终Prompt必须按照这个顺序。

---

# 七、第五步：Skill注入

用户选择：

三个Skill：

```
Reference Lock

Luxury Interior

Architectural Photography

```

---

系统获取：

对应内容：

---

Reference Lock：

```text
Use the provided image as the primary reference.

Preserve original composition,
camera angle,
spatial structure.

```

---

Luxury Interior：

```text
High-end luxury interior design,
premium materials,
refined atmosphere.

```

---

Architecture Photography：

```text
Professional architectural photography,
ARRI Alexa 65 look,
natural perspective.

```

---

组合。

---

# 八、第六步：Personal Style Rules

这是你的特色。

例如：

个人规则：

```json
{
always_add:

[
"Do not change original lighting direction",

"Preserve material texture",

"Do not redesign scene"

]

}
```

---

自动加入。

---

# 九、Prompt排序逻辑（非常重要）

很多人生成Prompt效果不好，就是顺序乱。


Compiler需要排序。

规则：

```
最高优先级：

1. 约束条件

↓

2. 参考控制

↓

3. 修改目标

↓

4. 风格

↓

5. 摄影语言

↓

6. 装饰描述
```

---

例如：

错误：

```
Luxury modern living room,
cinematic,
change night scene,
do not modify structure
```

---

正确：

```
Use provided image as reference.

Preserve original structure.

Modify lighting only.

Create luxury cinematic night atmosphere.

```

---

# 十、Prompt Compiler内部模块设计

代码结构：

给 Codex：

```
backend/src/compiler/


├── compiler.ts

├── loader.ts

├── templateEngine.ts

├── skillInjector.ts

├── ruleProcessor.ts

└── formatter.ts

```

---

## compiler.ts

主入口：

```typescript
compilePrompt({

model,

task,

template,

skills,

input

})

```

---

返回：

```json
{
prompt:

"xxxxx",

metadata:

{

model:"GPT-IMAGE 2",

skills:[...]

}

}
```

---

# 十一、规则冲突处理

这是必须考虑的。

例如：

Skill A：

```
保持原光线
```

Skill B：

```
改变为夕阳光
```

冲突。


怎么办？

增加：

## Priority（优先级）

---

Skill：

```json
{
name:

"Reference Lock",

priority:

100

}

```

---

Lighting：

```json
{
name:

"Golden Hour",

priority:

50

}

```

---

高优先级覆盖低优先级。

---

# 十二、Prompt生成结果保存

非常重要。

点击：

生成Prompt。


不要只是复制。


应该：

按钮：

```
保存到Prompt库
```

---

保存：

```
生成记录

↓

Prompt卡片

↓

关联：

Template

Skill

Model

```

---

以后你可以知道：

这个优秀Prompt来自：

```
GPT-IMAGE 2

+
室内修改模板

+
Reference Lock

+
Luxury Interior

```

---

# 十三、Compiler V1不要做什么

这里必须控制范围。

不要：

❌ 自动分析所有图片

❌ 自动联网学习模型

❌ 自动优化Prompt评分

❌ 自动调用所有AI模型


这些都是未来。

---

V1：

只做：

```
规则组合器

+
模板填充器

+
技能注入器
```

---

# 十四、最终 Prompt Vault 架构

现在完整：

```
                 Prompt Vault


                    UI层

        Prompt Library
        Prompt Generator


                    ↓


             Prompt Compiler


                    ↓


 ---------------------------------

 Model Rules

 Task Rules

 Templates

 Skills

 Personal Rules


 ---------------------------------


                    ↓


              Final Prompt


                    ↓


            Prompt Library保存

```

---

# 十五、我觉得现在已经到了一个关键节点

前面我们设计的是“软件”。

但现在这个系统其实已经具备一个更高级的形态：

> **个人 AI 创作操作系统（Personal AI Creative OS）的雏形。**

不过回到开发节奏：

V1 依然要克制。

我建议下一步设计：

## **Prompt Vault V1 MVP开发路线图**

也就是：

- 第一周做什么
- 第二周做什么
- 哪些功能暂缓
- Codex开发顺序

否则架构越来越漂亮，很容易陷入“设计很完整，迟迟不开工”。这个时候应该开始拆开发任务了。

---
Powered by [AI Exporter](https://saveai.net)