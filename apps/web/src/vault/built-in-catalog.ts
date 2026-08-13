import type {
  KnowledgeRecord,
  MediaType,
  ModelProfile,
  ModelTask,
  TemplateFieldSchema,
} from "../domain/types";

const UPDATED_AT = "2026-08-13T00:00:00.000Z";
const SECTION_ORDER = ["constraints", "reference", "modification", "style", "camera", "detail"] as const;
const FIELD_SCHEMA: TemplateFieldSchema = {
  fields: [{ name: "requirements", labelZh: "任务要求", labelEn: "Task requirements", type: "textarea", required: true }],
};

type TaskSeed = readonly [string, string, string, readonly string[]];
type ModelSeed = readonly [string, string, string, MediaType, string, readonly TaskSeed[]];

const MODEL_SEEDS: readonly ModelSeed[] = [
  ["gpt-image-2", "GPT-IMAGE 2", "OpenAI", "IMAGE", "高精度参考图编辑与商业视觉设计", [
    ["gpt-image-2-image-generate", "图片生成", "Image Generation", ["image_generate"]],
    ["gpt-image-2-reference-redraw", "参考图重绘", "Reference Redraw", ["image_edit", "reference_preserve"]],
    ["gpt-image-2-local-edit", "局部修改", "Local Edit", ["image_edit", "local_edit"]],
    ["gpt-image-2-scene-preserving-edit", "场景保持修改", "Scene-preserving Edit", ["image_edit", "reference_preserve"]],
    ["gpt-image-2-canvas-expand", "扩展画布", "Canvas Expansion", ["canvas_expand"]],
    ["gpt-image-2-style-transfer", "风格迁移", "Style Transfer", ["style_transfer"]],
  ]],
  ["nano-banana-2", "Nano Banana 2", "Google", "IMAGE", "快速视觉创作、图片编辑与多轮修改", [
    ["nano-banana-2-character-replace", "人物替换", "Character Replacement", ["character_replace"]],
    ["nano-banana-2-object-replace", "物体替换", "Object Replacement", ["object_replace"]],
    ["nano-banana-2-image-fusion", "图片融合", "Image Fusion", ["image_fusion"]],
    ["nano-banana-2-character-consistency", "角色一致性", "Character Consistency", ["character_consistency"]],
    ["nano-banana-2-local-enhance", "局部增强", "Local Enhancement", ["local_enhance"]],
  ]],
  ["kling-3", "Kling 3.0", "Kuaishou", "VIDEO", "商业短视频、人物动作与空间展示", [
    ["kling-3-image-to-video", "图片转视频", "Image to Video", ["image_to_video"]],
    ["kling-3-text-to-video", "文本生成视频", "Text to Video", ["text_to_video"]],
    ["kling-3-camera-motion", "镜头运动", "Camera Motion", ["camera_motion"]],
    ["kling-3-character-action", "人物动作", "Character Action", ["character_action"]],
  ]],
  ["seedance-2", "Seedance 2.0", "ByteDance", "VIDEO", "AI 视频创意、镜头设计与分镜生成", [
    ["seedance-2-storyboard", "电影分镜", "Cinematic Storyboard", ["storyboard"]],
    ["seedance-2-multi-shot", "多镜头视频", "Multi-shot Video", ["multi_scene"]],
    ["seedance-2-narrative-video", "剧情视频", "Narrative Video", ["narrative_video"]],
    ["seedance-2-commercial-ad", "商业广告", "Commercial Advertising", ["commercial_ad"]],
  ]],
];

export const BUILT_IN_MODELS: readonly ModelProfile[] = MODEL_SEEDS.map(
  ([stableKey, name, provider, mediaType, description], order) =>
    ({ stableKey, name, provider, mediaType, description, order }),
);

export const BUILT_IN_TASKS: readonly ModelTask[] = MODEL_SEEDS.flatMap(
  ([modelKey, , , , , tasks]) => tasks.map(
    ([stableKey, nameZh, nameEn, capabilities], order) =>
      ({ stableKey, modelKey, nameZh, nameEn, capabilities, sectionOrder: SECTION_ORDER, order }),
  ),
);

export const BUILT_IN_TEMPLATES: readonly KnowledgeRecord[] = BUILT_IN_TASKS.map(
  (task) => ({
    id: `builtin-template-${task.stableKey}-default`,
    stableKey: `${task.stableKey}-default`,
    kind: "TEMPLATE",
    owner: "BUILT_IN",
    nameZh: `${task.nameZh}基础模板`,
    nameEn: `${task.nameEn} Base Template`,
    contentZh: "任务要求：\n{{requirements}}\n\n请严格遵循已选择的约束与技能。",
    contentEn: "Task requirements:\n{{requirements}}\n\nStrictly follow the selected constraints and skills.",
    enabled: true,
    version: 1,
    priority: 0,
    category: "TEMPLATE",
    updatedAt: UPDATED_AT,
    taskKey: task.stableKey,
    fieldSchema: FIELD_SCHEMA,
  }),
);

type SkillSeed = readonly [
  string, string, string, string, string, string,
  readonly string[], number?, (string | null)?,
];
const ALL_MODELS = MODEL_SEEDS.map(([key]) => key);
const IMAGE_MODELS = ["gpt-image-2", "nano-banana-2"] as const;

const SKILL_SEEDS: readonly SkillSeed[] = [
  ["reference-lock", "参考图锁定", "Reference Lock", "REFERENCE", "使用提供的图片作为唯一主参考，保持构图、机位与空间关系。", "Use the provided image as the sole primary reference. Preserve composition, camera position, and spatial relationships.", IMAGE_MODELS, 900, "reference-control"],
  ["pixel-level-preservation", "像素级保持", "Pixel-level Preservation", "REFERENCE", "最大限度保持未指定区域的像素与细节不变。", "Preserve pixels and details in all unspecified areas as closely as possible.", IMAGE_MODELS, 850, "reference-control"],
  ["minimal-modification", "最小修改", "Minimal Modification", "REFERENCE", "仅修改明确指定的目标，不重新设计其他元素。", "Modify only the explicitly requested target and do not redesign other elements.", IMAGE_MODELS, 800, "modification-scope"],
  ["scene-structure-lock", "场景结构锁定", "Scene Structure Lock", "REFERENCE", "保持建筑、家具布局和空间尺度不变。", "Preserve architecture, furniture layout, and spatial scale.", IMAGE_MODELS, 820, "structure-control"],
  ["luxury-interior-photography", "豪宅室内摄影", "Luxury Interior Photography", "INTERIOR", "使用克制、高级的商业室内摄影语言。", "Use restrained, high-end commercial interior photography language.", IMAGE_MODELS],
  ["architectural-visualization", "建筑可视化", "Architectural Visualization", "INTERIOR", "强调准确透视、真实尺度和清晰空间层次。", "Emphasize accurate perspective, realistic scale, and clear spatial hierarchy.", IMAGE_MODELS],
  ["material-realism", "材质真实感", "Material Realism", "MATERIAL", "保留天然石材、木材、金属和玻璃的真实纹理响应。", "Preserve realistic texture response for stone, wood, metal, and glass.", IMAGE_MODELS],
  ["arri-alexa-65-look", "ARRI Alexa 65 质感", "ARRI Alexa 65 Look", "PHOTOGRAPHY", "采用自然动态范围、柔和高光与电影级色彩响应。", "Use natural dynamic range, soft highlight roll-off, and cinematic color response.", ALL_MODELS],
  ["24mm-architectural-lens", "24mm 建筑镜头", "24mm Architectural Lens", "CAMERA", "采用 24mm 建筑摄影视角，垂直线端正，避免夸张变形。", "Use a 24mm architectural perspective with straight verticals and no exaggerated distortion.", ALL_MODELS, 100, "lens"],
  ["cinematic-depth", "电影感景深", "Cinematic Depth", "CAMERA", "使用自然层次与克制景深，不制造虚假的强散景。", "Use natural depth layering and restrained depth of field without artificial heavy bokeh.", ALL_MODELS],
  ["natural-light-preservation", "自然光保持", "Natural Light Preservation", "LIGHTING", "保持原始自然光方向、强度关系与阴影逻辑。", "Preserve the original natural-light direction, intensity relationships, and shadow logic.", IMAGE_MODELS, 600, "lighting"],
  ["golden-hour-lighting", "黄金时刻光线", "Golden Hour Lighting", "LIGHTING", "转换为温暖、低角度的黄金时刻光线。", "Transform the scene with warm, low-angle golden-hour light.", ALL_MODELS, 500, "lighting"],
  ["blue-hour-cinematic", "蓝调时刻电影感", "Blue Hour Cinematic", "LIGHTING", "营造冷静蓝调环境光与克制暖色室内光的平衡。", "Create balanced cool blue-hour ambience with restrained warm interior light.", ALL_MODELS, 500, "lighting"],
  ["character-consistency", "角色一致性", "Character Consistency", "CHARACTER", "保持人物身份、面部特征、发型与服装连续一致。", "Preserve character identity, facial features, hairstyle, and wardrobe consistently.", ["nano-banana-2", "kling-3", "seedance-2"], 800, "character-control"],
  ["no-direct-eye-contact", "不直视镜头", "No Direct Eye Contact", "CHARACTER", "人物不要直视镜头，保持自然叙事状态。", "The character must not look directly at the camera; maintain a natural narrative state.", ["nano-banana-2", "kling-3", "seedance-2"]],
];

export const BUILT_IN_SKILLS: readonly KnowledgeRecord[] = SKILL_SEEDS.map(
  ([stableKey, nameZh, nameEn, category, contentZh, contentEn, modelKeys, priority = 100, conflictGroup = null]) => ({
    id: `builtin-skill-${stableKey}`,
    stableKey,
    kind: "SKILL",
    owner: "BUILT_IN",
    nameZh,
    nameEn,
    contentZh,
    contentEn,
    enabled: true,
    version: 1,
    priority,
    category,
    updatedAt: UPDATED_AT,
    modelKeys,
    conflictGroup,
  }),
);
