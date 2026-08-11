# you asked

message time: 2026-08-09 16:04:42

继续

---

# chatgpt response

好，我们继续设计 **Prompt Skill（技能库）**。

我觉得这一部分其实比“模型规则”更重要。

原因：

模型会变。

今天 GPT-IMAGE 2，未来 GPT-IMAGE 3、4；

Kling 3.0，未来 Kling 4.0。

但是你的创作方法论不会轻易变。

比如你已经形成的一套：

- 保持参考图 95% 不变
- LOCKED FROM REFERENCE IMAGE
- 不改变原始光线
- 保留材质纹理
- 商业摄影语言
- ARRI Alexa 65
- 不改变空间结构
- 禁止人物直视镜头

这些其实就是你的 **Prompt Skill资产**。

所以 Prompt Vault 的核心价值，应该从：

> 收藏 Prompt

逐渐升级为：

> 收藏 + 复用自己的 AI 创作方法。

---

# 一、Prompt Skill 的定位

简单理解：

Prompt 是一次作品。

Skill 是制作方法。


例如：

---

一个 Prompt：

```
现代东方豪宅客厅夜景修改
```

里面包含：

```
主体：
客厅

模型：
GPT-IMAGE 2

需求：
白天改夜景

```

---

但是它依赖：

```
Skill:

✓ Reference Lock
✓ Luxury Interior Photography
✓ Natural Material Preservation
✓ Cinematic Lighting

```

---

所以：

Prompt = 菜

Skill = 厨艺

---

# 二、Skill 数据结构设计

新增数据库：

## prompt_skills

```prisma
model PromptSkill {

  id String @id @default(uuid())


  name String


  description String?


  category SkillCategory


  content String


  applicableModels String?


  createdAt DateTime @default(now())


  updatedAt DateTime @updatedAt

}

```

---

字段解释：

---

## name

技能名称。

例如：

```
Reference Lock
```

---

## description

说明：

```
保持参考图中的空间结构、
光线和材质关系不变，
避免AI重新生成场景。
```

---

## category

技能类型。

例如：

```text
REFERENCE
STYLE
CAMERA
LIGHTING
MATERIAL
VIDEO
CHARACTER
```

---

## content

真正注入Prompt的内容。

例如：

```text
Use the provided image as the primary reference.

Preserve the original composition,
camera angle,
lighting direction,
material textures,
and spatial structure.

Do not redesign the scene.

```

---

# 三、Skill分类设计

V1 不要太多。

建议：

## 1. Reference（参考控制）

这个你最高频。

例如：

```
Reference Lock

Scene Preservation

Identity Preservation

Material Preservation

```

---

## 2. Photography（摄影语言）

例如：

```
ARRI Alexa 65

Architectural Photography

Luxury Editorial Photography

Commercial Product Photography

```

---

## 3. Lighting（光线）

例如：

```
Natural Window Light

Golden Hour

Blue Hour

Soft Studio Lighting

```

---

## 4. Camera（镜头）

例如：

```
24mm Wide Angle

35mm Documentary Lens

85mm Portrait Lens

Shallow Depth of Field

```

---

## 5. Material（材质）

特别适合你的室内项目。

例如：

```
Natural Stone Preservation

Wood Texture Enhancement

Metal Surface Realism

Glass Reflection Control

```

---

## 6. Video Motion（视频）

给 Kling / Seedance。

例如：

```
Slow Dolly In

Cinematic Camera Movement

Handheld Documentary Motion

```

---

# 四、Skill与模型的关系

这里非常重要。

不是所有Skill都适合所有模型。

例如：

Reference Lock：

适合：

```
GPT-IMAGE 2
Nano Banana 2
```

---

Camera Movement：

适合：

```
Kling 3.0
Seedance 2.0
```

---

所以增加：

skill_models关联。

结构：

```
Skill

↓

支持模型

```

---

例如：

数据库：

skill_model


|skill|model|
|-|-|
|Reference Lock|GPT-IMAGE 2|
|Reference Lock|Nano Banana|
|Camera Motion|Kling|
|Camera Motion|Seedance|

---

这样生成器里面：

选择模型后：

自动过滤。

---

# 五、Skill如何参与Prompt生成？

生成流程：

例如：

用户：

选择：

```
模型：

GPT-IMAGE 2


任务：

图片修改


Skill：

Reference Lock

Luxury Interior

Cinematic Lighting

```

---

系统组合：

第一层：

模型规则：

```
GPT-IMAGE 2 Edit Structure
```

↓

第二层：

任务规则：

```
Image Modification Logic
```

↓

第三层：

Skill：

```
Reference Lock

Luxury Interior

Lighting

```

↓

第四层：

用户需求：

```
把白天改成夜景
```

---

最终：

```
Use the provided image as the only reference.

Preserve:
- architecture
- furniture layout
- camera perspective
- material textures

Modification:
Transform daytime lighting into an elegant night scene.

Lighting:
...

Style:
Luxury interior photography...

```

---

# 六、Skill管理UI设计

这个不要放主导航。

放：

设置里面。

或者：

Prompt Engine管理。


页面：

```
Prompt Skills

搜索技能...


Reference

┌─────────────┐
│ Reference Lock
│ 保持参考图结构
│ GPT-IMAGE
│ ⭐⭐⭐⭐⭐
└─────────────┘


Photography

┌─────────────┐
│ ARRI Alexa 65
│ 商业摄影语言
└─────────────┘

```

---

# 七、Skill卡片设计

类似Prompt卡片。

但是没有图片。

结构：

```
┌────────────────┐

🔒 Reference Lock


保持参考图结构稳定


适用：

GPT-IMAGE
Nano Banana


[复制]

└────────────────┘

```

---

# 八、Skill版本管理

这个非常建议。

因为你的Prompt技巧会不断优化。

例如：

Reference Lock：

V1:

```
Keep the original scene unchanged.
```

V2:

```
Use provided image as primary reference.
Preserve composition...
```

V3:

加入：

```
Do not regenerate background elements.
```

---

所以：

skill_versions

预留。

---

# 九、你的个人Skill库初始应该是什么？

根据你过去大量Prompt，我觉得第一批可以建立：

## Reference类

1. Reference Lock
2. Pixel-level Preservation
3. Minimal Modification
4. Scene Structure Lock


## Interior类

5. Luxury Interior Photography
6. Architectural Visualization
7. Material Realism


## Camera类

8. ARRI Alexa 65 Look
9. 24mm Architectural Lens
10. Cinematic Depth


## Lighting类

11. Natural Light Preservation
12. Golden Hour Lighting
13. Blue Hour Cinematic


## Character类

14. Character Consistency
15. No Direct Eye Contact

---

# 十、最终 Prompt Engine V1 架构

现在非常清晰：

```
Prompt Engine


             User Request

                  ↓


        Model Profile

 GPT-IMAGE 2 / Nano Banana / Kling / Seedance


                  ↓


        Task Rule


                  ↓


        Skill Library


                  ↓


        Personal Style Rules


                  ↓


             Final Prompt

```

---

我觉得做到这里，Prompt Vault 已经不是一个简单收藏工具了。

它有点像：

> **你的个人 AI 创作知识库 + Prompt 编译器。**

下一步我建议继续设计：

**Prompt Template（模板系统）**

因为 Skill 解决的是“能力模块”，而 Template 解决的是“完整Prompt骨架”。

比如：

- GPT-IMAGE 室内修改模板
- 产品摄影模板
- Kling视频分镜模板

这两个组合起来，才是真正的 Prompt Generator。

---
Powered by [AI Exporter](https://saveai.net)