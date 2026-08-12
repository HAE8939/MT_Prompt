import { Check, Clipboard, Save, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { KnowledgeRecord, PromptRecord } from "../../domain/types";
import { useVault } from "../../vault/VaultProvider";
import { compileInBrowser, type BrowserCompileResult } from "./browser-compiler";
import "./generator.css";

type LoadState = "loading" | "ready" | "error";

export function GeneratorPage() {
  const { knowledge, prompts } = useVault();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [records, setRecords] = useState<KnowledgeRecord[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [requirement, setRequirement] = useState("");
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [result, setResult] = useState<BrowserCompileResult>();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"zh" | "en" | null>(null);

  useEffect(() => {
    let active = true;
    knowledge.list().then((nextRecords) => {
      if (!active) return;
      setRecords(nextRecords);
      setTemplateId(nextRecords.find(({ kind, enabled }) => kind === "TEMPLATE" && enabled)?.id ?? "");
      setLoadState("ready");
    }).catch(() => {
      if (active) setLoadState("error");
    });
    return () => { active = false; };
  }, [knowledge]);

  const templates = useMemo(
    () => records.filter(({ kind, enabled }) => kind === "TEMPLATE" && enabled),
    [records],
  );
  const skills = useMemo(
    () => records.filter(({ kind, enabled }) => kind === "SKILL" && enabled),
    [records],
  );
  const rules = useMemo(
    () => records.filter(({ kind, enabled }) => kind === "RULE" && enabled),
    [records],
  );
  const selectedTemplate = templates.find(({ id }) => id === templateId) ?? templates[0];

  function toggleSkill(id: string) {
    setSkillIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  }

  function compile() {
    if (!selectedTemplate || !requirement.trim()) return;
    setError("");
    setSaved(false);
    try {
      setResult(compileInBrowser({
        requirementZh: requirement,
        requirementEn: `Original Chinese requirement: ${requirement.trim()}`,
        template: selectedTemplate,
        skills: skills.filter(({ id }) => skillIds.includes(id)),
        rules,
      }));
    } catch (compileError) {
      setError(compileError instanceof Error ? compileError.message : "生成失败，请检查模板和 Skill。 ");
    }
  }

  async function save() {
    if (!result || saving || saved) return;
    setSaving(true);
    setError("");
    const now = new Date().toISOString();
    const prompt: PromptRecord = {
      id: crypto.randomUUID(),
      title: requirement.trim().slice(0, 160),
      description: "由 MT-Prompt 浏览器生成器创建",
      contentZh: result.contentZh,
      contentEn: result.contentEn,
      negativeZh: "",
      negativeEn: "",
      mediaType: "IMAGE",
      category: selectedTemplate?.category || "通用",
      tags: ["生成器"],
      favorite: false,
      rating: 0,
      origin: "GENERATED",
      provenance: result.provenance,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await prompts.create(prompt, []);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败，请重试。");
    } finally {
      setSaving(false);
    }
  }

  async function copy(language: "zh" | "en", value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(language);
    window.setTimeout(() => setCopied(null), 1200);
  }

  return <main className="generator-page">
    <header className="page-header">
      <div><h1>Prompt 生成器</h1><span className="count">中文填写需求，本地生成中英双语 Prompt</span></div>
    </header>

    {loadState === "loading" ? <div className="state-panel"><p>正在加载本地模板...</p></div> : null}
    {loadState === "error" ? <div className="state-panel" role="alert"><h2>无法加载本地知识库</h2><p>请刷新页面后重试。</p></div> : null}
    {loadState === "ready" && !selectedTemplate ? <div className="state-panel"><h2>暂无可用模板</h2><p>请先在“模板与技能”中启用或创建模板。</p></div> : null}

    {selectedTemplate ? <div className="generator-layout">
      <section className="generator-form" aria-label="生成配置">
        <label>模板
          <select aria-label="模板" value={selectedTemplate.id} onChange={(event) => setTemplateId(event.target.value)}>
            {templates.map((template) => <option key={template.id} value={template.id}>{template.nameZh}</option>)}
          </select>
        </label>
        <label>任务要求
          <textarea aria-label="任务要求" value={requirement} onChange={(event) => setRequirement(event.target.value)} placeholder="用中文描述你想生成或修改的内容" rows={8} />
        </label>
        <fieldset className="skill-picker">
          <legend>可选 Skill</legend>
          {skills.length ? skills.map((skill) => <label key={skill.id}>
            <input aria-label={skill.nameZh} type="checkbox" checked={skillIds.includes(skill.id)} onChange={() => toggleSkill(skill.id)} />
            {skill.nameZh}<span>{skill.category}</span>
          </label>) : <p>当前没有已启用的 Skill</p>}
        </fieldset>
        <button className="primary-button generator-submit" disabled={!requirement.trim()} onClick={compile}>
          <Sparkles size={16} />生成 Prompt
        </button>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
      </section>

      <section className="generator-result" aria-live="polite">
        <header><h2>生成结果</h2>{result ? <span className="result-status">本地双语编译完成</span> : null}</header>
        {result ? <div className="result-content">
          <PromptResult title="中文 Prompt" value={result.contentZh} language="zh" copied={copied} onCopy={copy} />
          <PromptResult title="English Prompt" value={result.contentEn} language="en" copied={copied} onCopy={copy} />
          <section className="contribution-list"><h3>编译来源</h3>{result.contributions.map((item, index) => <div key={`${item.sourceType}-${item.sourceKey}-${index}`}><strong>{item.sourceType}</strong><span>{item.sourceKey} · v{item.version} · {item.section}</span></div>)}</section>
          <div className="result-actions"><button className="primary-button" disabled={saving || saved} onClick={save}><Save size={15} />{saving ? "保存中..." : saved ? "已保存到 Prompt 库" : "保存到 Prompt 库"}</button></div>
        </div> : <div className="state-panel"><Sparkles size={28} /><h2>等待生成</h2><p>选择模板和 Skill，填写中文任务要求后生成。</p></div>}
      </section>
    </div> : null}
  </main>;
}

function PromptResult({ title, value, language, copied, onCopy }: {
  title: string;
  value: string;
  language: "zh" | "en";
  copied: "zh" | "en" | null;
  onCopy(language: "zh" | "en", value: string): void;
}) {
  return <section className="prompt-block"><div className="block-heading"><span>{title}</span><button onClick={() => onCopy(language, value)}>{copied === language ? <Check size={14} /> : <Clipboard size={14} />}复制</button></div><pre>{value}</pre></section>;
}
