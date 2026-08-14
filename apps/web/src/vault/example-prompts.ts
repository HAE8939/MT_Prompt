import type { PromptRecord } from "../domain/types";
import { CIYUAN01_TOP10_PROMPTS } from "./ciyuan01-top10";

const CREATED_AT = "2026-08-12T00:00:00.000Z";

const examples: Array<Omit<Pick<PromptRecord, "title" | "description" | "contentZh" | "contentEn" | "category" | "tags">, "contentZh">> = [
  {
    title: "毛坯房转现代客厅效果图",
    description: "将毛坯空间转化为可落地的现代客厅设计效果图。",
    contentEn: "Transform the unfinished shell into a buildable modern living room while preserving the real columns, beams, doors, and windows. Use restrained neutrals, natural wood, layered lighting, accurate furniture scale, integrated storage, and construction-ready detailing.",
    category: "住宅空间",
    tags: ["客厅", "现代", "效果图"],
  },
  {
    title: "卫生间防水与石材湿区综合展板",
    description: "整合卫生间湿区防水节点与石材铺装表达。",
    contentEn: "Create a comprehensive bathroom wet-zone board showing zoning, wall and floor waterproofing upstands, threshold water stops, drainage slopes, stone setting-out, internal and external corner details, and clearly structured material annotations for construction coordination.",
    category: "施工工艺",
    tags: ["卫生间", "防水", "石材"],
  },
  {
    title: "现代中餐厅动线与材质综合展板",
    description: "展示现代中餐厅的客流、服务流线与材料策略。",
    contentEn: "Produce a modern Chinese restaurant board mapping arrival, waiting, open dining, private rooms, food service, and back-of-house circulation, paired with floor, wall, ceiling, and millwork material samples, key dimensions, and lighting intent.",
    category: "商业空间",
    tags: ["中餐厅", "动线", "材质"],
  },
  {
    title: "民宿外立面改造综合展板",
    description: "面向既有建筑的民宿外立面改造提案。",
    contentEn: "Create a guesthouse facade renovation board comparing before and after conditions, covering entrance identity, window adjustments, shading, night lighting, signage, and landscape edges, with primary materials, junction details, and weathering strategies.",
    category: "建筑改造",
    tags: ["民宿", "外立面", "改造"],
  },
  {
    title: "无主灯吊顶施工工艺综合展板",
    description: "系统表达无主灯吊顶构造及灯具安装节点。",
    contentEn: "Design a construction board for a layered no-main-light ceiling, including framing layout, coves, linear lights, downlights and spotlights, crack prevention, access panels, and MEP coordination, supported by sections and numbered installation steps.",
    category: "施工工艺",
    tags: ["无主灯", "吊顶", "节点"],
  },
  {
    title: "屋顶花园空中露台综合展板",
    description: "兼顾景观体验、结构荷载与排水的屋顶露台方案。",
    contentEn: "Create a rooftop garden and sky terrace board showing functional zones, circulation, planting, lounge furniture, shade, and night lighting, together with structural loading, waterproofing, drainage, overflow, and guardrail details.",
    category: "景观空间",
    tags: ["屋顶花园", "露台", "景观"],
  },
  {
    title: "五星级酒店大堂综合设计展板",
    description: "呈现五星级酒店大堂的空间、服务与材质系统。",
    contentEn: "Design a five-star hotel lobby board covering drop-off, concierge, reception, lounge, lift lobby, and luggage circulation, combining perspectives, plans, materials, lighting, art, and custom furniture into a refined premium brand experience.",
    category: "酒店空间",
    tags: ["酒店", "大堂", "综合设计"],
  },
  {
    title: "城市更新商业街区综合展板",
    description: "展示存量街区更新中的业态、公共空间与界面策略。",
    contentEn: "Create an urban regeneration commercial district board analysing existing fabric, tenant mix, pedestrian and vehicle circulation, public space, street frontage, wayfinding, and phased delivery, using detail views and materials to express coexistence of old and new.",
    category: "城市设计",
    tags: ["城市更新", "商业街区", "公共空间"],
  },
  {
    title: "户外铝合金凉亭",
    description: "面向产品展示与落地施工的铝合金凉亭提示词。",
    contentEn: "Generate an outdoor aluminium pavilion with light proportions, weather-resistant finishes, concealed drainage, shading elements, connection details, and foundation anchoring, shown in a realistic garden during daytime and evening use.",
    category: "户外产品",
    tags: ["凉亭", "铝合金", "户外"],
  },
  {
    title: "黑胡桃实木餐椅",
    description: "强调比例、榫卯和木材质感的家具产品设计。",
    contentEn: "Design a solid black walnut dining chair with ergonomic proportions, restrained curves, and durable joinery. Show front, side, and rear views, key dimensions, connection details, grain and matte finish, plus a naturally lit dining setting.",
    category: "家具产品",
    tags: ["餐椅", "黑胡桃", "实木"],
  },
];

export const EXAMPLE_PROMPTS: PromptRecord[] = examples.map((example, index) => ({
  id: `builtin-prompt-${String(index + 1).padStart(2, "0")}`,
  ...example,
  contentZh: CIYUAN01_TOP10_PROMPTS[index] ?? "",
  negativeZh: "避免结构失真、比例错误、材质塑料感、过度装饰、文字乱码和不可施工细节。",
  negativeEn: "Avoid distorted structure, incorrect scale, plastic-looking materials, excessive decoration, garbled text, and details that cannot be built.",
  mediaType: "IMAGE",
  favorite: false,
  rating: 0,
  origin: "BUILT_IN",
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
}));
