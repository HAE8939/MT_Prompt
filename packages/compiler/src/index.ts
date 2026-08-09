export type LocalizedValue = { zh: string; en: string };

export type CompileInput = {
  modelTaskKey: string;
  template: { key: string; version: number; bodyZh: string; bodyEn: string };
  inputValues: Record<string, LocalizedValue>;
  skills: ReadonlyArray<{ key: string; version: number; section: string; priority: number; conflictGroup: string | null; contentZh: string; contentEn: string }>;
  personalRules: ReadonlyArray<{ key: string; version: number; section: string; priority: number; contentZh: string; contentEn: string }>;
  sectionOrder: readonly string[];
};

export type CompileResult = {
  contentZh: string;
  contentEn: string;
  warnings: string[];
  metadata: { modelTaskKey: string; templateKey: string; templateVersion: number; skillKeys: string[]; personalRuleKeys: string[] };
};

export class CompilerConflictError extends Error {
  constructor(public readonly conflictGroup: string, public readonly skillKeys: string[]) {
    super(`Conflicting skills in group ${conflictGroup}: ${skillKeys.join(", ")}`);
    this.name = "CompilerConflictError";
  }
}

type Contribution = { section: string; priority: number; contentZh: string; contentEn: string };

function fill(body: string, values: Record<string, LocalizedValue>, language: "zh" | "en") {
  return body.replace(/{{\s*([\w-]+)\s*}}/g, (_, key: string) => values[key]?.[language] ?? "").trim();
}

function uniqueContributions(contributions: Contribution[]) {
  const seen = new Set<string>();
  return contributions.filter((contribution) => {
    const signature = `${contribution.contentZh}\u0000${contribution.contentEn}`;
    if (!contribution.contentZh || seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

export function compilePrompt(input: CompileInput): CompileResult {
  const groups = new Map<string, string[]>();
  for (const skill of input.skills) {
    if (!skill.conflictGroup) continue;
    groups.set(skill.conflictGroup, [...(groups.get(skill.conflictGroup) ?? []), skill.key]);
  }
  for (const [group, keys] of groups) {
    if (keys.length > 1) throw new CompilerConflictError(group, keys);
  }

  const modificationZh = fill(input.template.bodyZh, input.inputValues, "zh");
  const modificationEn = fill(input.template.bodyEn, input.inputValues, "en");
  const contributions: Contribution[] = [
    ...input.personalRules.map((rule) => ({ section: rule.section, priority: rule.priority, contentZh: rule.contentZh, contentEn: rule.contentEn })),
    ...input.skills.map((skill) => ({ section: skill.section, priority: skill.priority, contentZh: skill.contentZh, contentEn: skill.contentEn })),
    { section: "modification", priority: 0, contentZh: modificationZh, contentEn: modificationEn },
  ];
  const order = new Map(input.sectionOrder.map((section, index) => [section, index]));
  const sorted = uniqueContributions(contributions).sort((a, b) => (order.get(a.section) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.section) ?? Number.MAX_SAFE_INTEGER) || b.priority - a.priority);

  return {
    contentZh: sorted.map((item) => item.contentZh).join("\n\n"),
    contentEn: sorted.map((item) => item.contentEn).join("\n\n"),
    warnings: [],
    metadata: {
      modelTaskKey: input.modelTaskKey,
      templateKey: input.template.key,
      templateVersion: input.template.version,
      skillKeys: input.skills.map((skill) => skill.key),
      personalRuleKeys: input.personalRules.map((rule) => rule.key),
    },
  };
}
