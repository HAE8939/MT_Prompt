import type { KnowledgeRecord } from "../domain/types";
import { BUILT_IN_SKILLS, BUILT_IN_TEMPLATES } from "./built-in-catalog";

const updatedAt = "2026-08-13T00:00:00.000Z";

const PERSONAL_RULES: readonly KnowledgeRecord[] = [
  {
    id: "builtin-rule-output",
    stableKey: "rule.clear-output",
    kind: "RULE",
    owner: "BUILT_IN",
    nameZh: "清晰可执行",
    nameEn: "Clear and actionable",
    contentZh: "表达应具体、无歧义，并避免互相冲突的要求。",
    contentEn: "Keep the instructions specific, unambiguous, and free from conflicting requirements.",
    enabled: true,
    version: 1,
    priority: 10,
    category: "constraints",
    updatedAt,
  },
  {
    id: "builtin-rule-no-garble",
    stableKey: "rule.no-garbled-text",
    kind: "RULE",
    owner: "BUILT_IN",
    nameZh: "避免乱码与伪文字",
    nameEn: "Avoid garbled text",
    contentZh: "画面中的标注、招牌和文字应清晰可读；无法可靠生成时减少文字。",
    contentEn: "Keep labels, signs, and text legible; reduce text when it cannot be rendered reliably.",
    enabled: true,
    version: 1,
    priority: 20,
    category: "quality",
    updatedAt,
  },
];

export const BUILT_IN_KNOWLEDGE: readonly KnowledgeRecord[] = [
  ...BUILT_IN_TEMPLATES,
  ...BUILT_IN_SKILLS,
  ...PERSONAL_RULES,
];
