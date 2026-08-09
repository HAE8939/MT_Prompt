export type SeedTemplate = {
  key: string;
  nameZh: string;
  nameEn: string;
  templateZh: string;
  templateEn: string;
  fieldSchema: {
    fields: Array<{ name: string; labelZh: string; labelEn: string; type: "textarea"; required: boolean }>;
  };
};

export type SeedTask = {
  key: string;
  nameZh: string;
  nameEn: string;
  capabilities: string[];
  template: SeedTemplate;
};

export type SeedModel = {
  key: string;
  name: string;
  provider: string;
  mediaType: "IMAGE" | "VIDEO";
  description: string;
  tasks: SeedTask[];
};

const sections = ["constraints", "reference", "modification", "style", "camera", "detail"];

function task(key: string, nameZh: string, nameEn: string, capabilities: string[]): SeedTask {
  return {
    key,
    nameZh,
    nameEn,
    capabilities,
    template: {
      key: `${key}-default`,
      nameZh: `${nameZh}基础模板`,
      nameEn: `${nameEn} Base Template`,
      templateZh: "任务要求：\n{{requirements}}\n\n请严格遵循已选择的约束与技能。",
      templateEn: "Task requirements:\n{{requirements}}\n\nStrictly follow the selected constraints and skills.",
      fieldSchema: {
        fields: [{ name: "requirements", labelZh: "任务要求", labelEn: "Task requirements", type: "textarea", required: true }],
      },
    },
  };
}

export const models: SeedModel[] = [
  {
    key: "gpt-image-2", name: "GPT-IMAGE 2", provider: "OpenAI", mediaType: "IMAGE",
    description: "高精度参考图编辑与商业视觉设计",
    tasks: [
      task("gpt-image-2-image-generate", "图片生成", "Image Generation", ["image_generate"]),
      task("gpt-image-2-reference-redraw", "参考图重绘", "Reference Redraw", ["image_edit", "reference_preserve"]),
      task("gpt-image-2-local-edit", "局部修改", "Local Edit", ["image_edit", "local_edit"]),
      task("gpt-image-2-scene-preserving-edit", "场景保持修改", "Scene-preserving Edit", ["image_edit", "reference_preserve"]),
      task("gpt-image-2-canvas-expand", "扩展画布", "Canvas Expansion", ["canvas_expand"]),
      task("gpt-image-2-style-transfer", "风格迁移", "Style Transfer", ["style_transfer"]),
    ],
  },
  {
    key: "nano-banana-2", name: "Nano Banana 2", provider: "Google", mediaType: "IMAGE",
    description: "快速视觉创作、图片编辑与多轮修改",
    tasks: [
      task("nano-banana-2-character-replace", "人物替换", "Character Replacement", ["character_replace"]),
      task("nano-banana-2-object-replace", "物体替换", "Object Replacement", ["object_replace"]),
      task("nano-banana-2-image-fusion", "图片融合", "Image Fusion", ["image_fusion"]),
      task("nano-banana-2-character-consistency", "角色一致性", "Character Consistency", ["character_consistency"]),
      task("nano-banana-2-local-enhance", "局部增强", "Local Enhancement", ["local_enhance"]),
    ],
  },
  {
    key: "kling-3", name: "Kling 3.0", provider: "Kuaishou", mediaType: "VIDEO",
    description: "商业短视频、人物动作与空间展示",
    tasks: [
      task("kling-3-image-to-video", "图片转视频", "Image to Video", ["image_to_video"]),
      task("kling-3-text-to-video", "文本生成视频", "Text to Video", ["text_to_video"]),
      task("kling-3-camera-motion", "镜头运动", "Camera Motion", ["camera_motion"]),
      task("kling-3-character-action", "人物动作", "Character Action", ["character_action"]),
    ],
  },
  {
    key: "seedance-2", name: "Seedance 2.0", provider: "ByteDance", mediaType: "VIDEO",
    description: "AI 视频创意、镜头设计与分镜生成",
    tasks: [
      task("seedance-2-storyboard", "电影分镜", "Cinematic Storyboard", ["storyboard"]),
      task("seedance-2-multi-shot", "多镜头视频", "Multi-shot Video", ["multi_scene"]),
      task("seedance-2-narrative-video", "剧情视频", "Narrative Video", ["narrative_video"]),
      task("seedance-2-commercial-ad", "商业广告", "Commercial Advertising", ["commercial_ad"]),
    ],
  },
];

export type SeedSkill = {
  key: string;
  nameZh: string;
  nameEn: string;
  descriptionZh: string;
  descriptionEn: string;
  contentZh: string;
  contentEn: string;
  category: string;
  priority: number;
  conflictGroup: string | null;
  modelKeys: string[];
};

const allImageModels = ["gpt-image-2", "nano-banana-2"];
const allModels = models.map((model) => model.key);

function skill(
  key: string, nameZh: string, nameEn: string, category: string,
  contentZh: string, contentEn: string, modelKeys = allModels,
  priority = 100, conflictGroup: string | null = null,
): SeedSkill {
  return { key, nameZh, nameEn, descriptionZh: contentZh, descriptionEn: contentEn, contentZh, contentEn, category, priority, conflictGroup, modelKeys };
}

export const skills: SeedSkill[] = [
  skill("reference-lock", "参考图锁定", "Reference Lock", "REFERENCE", "使用提供的图片作为唯一主参考，保持构图、机位与空间关系。", "Use the provided image as the sole primary reference. Preserve composition, camera position, and spatial relationships.", allImageModels, 900, "reference-control"),
  skill("pixel-level-preservation", "像素级保持", "Pixel-level Preservation", "REFERENCE", "最大限度保持未指定区域的像素与细节不变。", "Preserve pixels and details in all unspecified areas as closely as possible.", allImageModels, 850, "reference-control"),
  skill("minimal-modification", "最小修改", "Minimal Modification", "REFERENCE", "仅修改明确指定的目标，不重新设计其他元素。", "Modify only the explicitly requested target and do not redesign other elements.", allImageModels, 800, "modification-scope"),
  skill("scene-structure-lock", "场景结构锁定", "Scene Structure Lock", "REFERENCE", "保持建筑、家具布局和空间尺度不变。", "Preserve architecture, furniture layout, and spatial scale.", allImageModels, 820, "structure-control"),
  skill("luxury-interior-photography", "豪宅室内摄影", "Luxury Interior Photography", "INTERIOR", "使用克制、高级的商业室内摄影语言。", "Use restrained, high-end commercial interior photography language.", allImageModels),
  skill("architectural-visualization", "建筑可视化", "Architectural Visualization", "INTERIOR", "强调准确透视、真实尺度和清晰空间层次。", "Emphasize accurate perspective, realistic scale, and clear spatial hierarchy.", allImageModels),
  skill("material-realism", "材质真实感", "Material Realism", "MATERIAL", "保留天然石材、木材、金属和玻璃的真实纹理响应。", "Preserve realistic texture response for stone, wood, metal, and glass.", allImageModels),
  skill("arri-alexa-65-look", "ARRI Alexa 65 质感", "ARRI Alexa 65 Look", "PHOTOGRAPHY", "采用自然动态范围、柔和高光与电影级色彩响应。", "Use natural dynamic range, soft highlight roll-off, and cinematic color response.", allModels),
  skill("24mm-architectural-lens", "24mm 建筑镜头", "24mm Architectural Lens", "CAMERA", "采用 24mm 建筑摄影视角，垂直线端正，避免夸张变形。", "Use a 24mm architectural perspective with straight verticals and no exaggerated distortion.", allModels, 100, "lens"),
  skill("cinematic-depth", "电影感景深", "Cinematic Depth", "CAMERA", "使用自然层次与克制景深，不制造虚假的强散景。", "Use natural depth layering and restrained depth of field without artificial heavy bokeh.", allModels),
  skill("natural-light-preservation", "自然光保持", "Natural Light Preservation", "LIGHTING", "保持原始自然光方向、强度关系与阴影逻辑。", "Preserve the original natural-light direction, intensity relationships, and shadow logic.", allImageModels, 600, "lighting"),
  skill("golden-hour-lighting", "黄金时刻光线", "Golden Hour Lighting", "LIGHTING", "转换为温暖、低角度的黄金时刻光线。", "Transform the scene with warm, low-angle golden-hour light.", allModels, 500, "lighting"),
  skill("blue-hour-cinematic", "蓝调时刻电影感", "Blue Hour Cinematic", "LIGHTING", "营造冷静蓝调环境光与克制暖色室内光的平衡。", "Create balanced cool blue-hour ambience with restrained warm interior light.", allModels, 500, "lighting"),
  skill("character-consistency", "角色一致性", "Character Consistency", "CHARACTER", "保持人物身份、面部特征、发型与服装连续一致。", "Preserve character identity, facial features, hairstyle, and wardrobe consistently.", ["nano-banana-2", "kling-3", "seedance-2"], 800, "character-control"),
  skill("no-direct-eye-contact", "不直视镜头", "No Direct Eye Contact", "CHARACTER", "人物不要直视镜头，保持自然叙事状态。", "The character must not look directly at the camera; maintain a natural narrative state.", ["nano-banana-2", "kling-3", "seedance-2"]),
];

export const defaultSectionOrder = sections;
