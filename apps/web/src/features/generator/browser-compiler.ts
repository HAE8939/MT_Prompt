import { compilePrompt } from "@promptvault/compiler";
import type { KnowledgeRecord, ProvenanceSnapshot } from "../../domain/types";

const DEFAULT_SECTION_ORDER = [
  "constraints",
  "reference",
  "modification",
  "style",
  "camera",
  "detail",
] as const;

export interface BrowserCompileInput {
  requirementZh: string;
  requirementEn?: string;
  template: KnowledgeRecord;
  skills: readonly KnowledgeRecord[];
  rules: readonly KnowledgeRecord[];
  now?: () => string;
}

export interface BrowserCompileResult {
  contentZh: string;
  contentEn: string;
  warnings: string[];
  provenance: ProvenanceSnapshot;
  contributions: ReturnType<typeof compilePrompt>["contributions"];
}

function cloneKnowledge(record: KnowledgeRecord): KnowledgeRecord {
  return structuredClone(record);
}

export function compileInBrowser(input: BrowserCompileInput): BrowserCompileResult {
  if (input.template.kind !== "TEMPLATE") {
    throw new Error("BROWSER_COMPILER_TEMPLATE_REQUIRED");
  }

  const skills = input.skills.filter(
    (record) => record.kind === "SKILL" && record.enabled,
  );
  const rules = input.rules.filter(
    (record) => record.kind === "RULE" && record.enabled,
  );
  const requirementZh = input.requirementZh.trim();
  const requirementEn = input.requirementEn?.trim() || requirementZh;

  const compiled = compilePrompt({
    modelTaskKey: input.template.category || "general",
    template: {
      key: input.template.stableKey,
      version: input.template.version,
      bodyZh: input.template.contentZh,
      bodyEn: input.template.contentEn,
    },
    inputValues: {
      requirement: { zh: requirementZh, en: requirementEn },
      requirements: { zh: requirementZh, en: requirementEn },
    },
    skills: skills.map((record) => ({
      key: record.stableKey,
      version: record.version,
      section: record.category || "detail",
      priority: record.priority,
      conflictGroup: record.conflictGroup ?? null,
      contentZh: record.contentZh,
      contentEn: record.contentEn,
    })),
    personalRules: rules.map((record) => ({
      key: record.stableKey,
      version: record.version,
      section: record.category || "constraints",
      priority: record.priority,
      contentZh: record.contentZh,
      contentEn: record.contentEn,
    })),
    sectionOrder: DEFAULT_SECTION_ORDER,
  });

  return {
    contentZh: compiled.contentZh,
    contentEn: compiled.contentEn,
    warnings: compiled.warnings,
    contributions: compiled.contributions,
    provenance: {
      compilerVersion: "browser-v1",
      template: cloneKnowledge(input.template),
      skills: skills.map(cloneKnowledge),
      createdAt: input.now?.() ?? new Date().toISOString(),
    },
  };
}
