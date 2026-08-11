import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Clipboard, RefreshCw, Save, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api-client";
import "./generator.css";

type Template = { id: string; nameZh: string; fieldSchema?: { fields?: Array<{ name: string; labelZh: string; required: boolean }> } };
type Task = { id: string; nameZh: string; templates: Template[] };
type Model = { id: string; name: string; tasks: Task[] };
type Skill = { id: string; nameZh: string; category: string };
type Compilation = { id: string; contentZh: string; contentEn: string | null; translationStatus: string };

export function GeneratorPage() {
  const [modelId, setModelId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [requirement, setRequirement] = useState("");
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [copied, setCopied] = useState<"zh" | "en" | null>(null);
  const modelsQuery = useQuery({ queryKey: ["models"], queryFn: () => api<Model[]>("/models") });
  const models = modelsQuery.data ?? [];
  const selectedModel = models.find((model) => model.id === modelId) ?? models[0];
  const selectedTask = selectedModel?.tasks.find((task) => task.id === taskId) ?? selectedModel?.tasks[0];
  const selectedTemplate = selectedTask?.templates.find((template) => template.id === templateId) ?? selectedTask?.templates[0];
  const skillsQuery = useQuery({ queryKey: ["skills", selectedTask?.id], enabled: Boolean(selectedTask?.id), queryFn: () => api<{ data: Skill[] }>(`/skills?modelTaskId=${selectedTask?.id}`).then((response) => response.data) });
  const inputField = useMemo(() => selectedTemplate?.fieldSchema?.fields?.[0], [selectedTemplate]);

  useEffect(() => { if (selectedModel && modelId !== selectedModel.id) setModelId(selectedModel.id); }, [modelId, selectedModel]);
  useEffect(() => { if (selectedTask && taskId !== selectedTask.id) setTaskId(selectedTask.id); }, [selectedTask, taskId]);
  useEffect(() => { if (selectedTemplate && templateId !== selectedTemplate.id) setTemplateId(selectedTemplate.id); }, [selectedTemplate, templateId]);
  useEffect(() => { setSkillIds([]); }, [selectedTask?.id]);

  const compileMutation = useMutation({ mutationFn: () => api<Compilation>("/compiler/compile", { method: "POST", body: JSON.stringify({ modelTaskId: selectedTask?.id, templateId: selectedTemplate?.id, skillIds, inputValues: { [inputField?.name ?? "requirement"]: requirement } }) }) });
  const saveMutation = useMutation({ mutationFn: () => api<{ id: string; title: string }>(`/compilations/${compileMutation.data?.id}/save-as-prompt`, { method: "POST", body: JSON.stringify({ title: requirement.trim().slice(0, 160) }) }) });
  const retryMutation = useMutation({ mutationFn: () => api<Compilation>(`/compilations/${compileMutation.data?.id}/retry-translation`, { method: "POST" }) });
  const result = retryMutation.data ?? compileMutation.data;
  function toggleSkill(id: string) { setSkillIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  async function copy(language: "zh" | "en", value: string | null) { if (!value) return; await navigator.clipboard.writeText(value); setCopied(language); window.setTimeout(() => setCopied(null), 1200); }

  return <main className="generator-page">
    <header className="page-header"><div><h1>Prompt 生成器</h1><span className="count">中文需求，输出中英双语 Prompt</span></div></header>
    {modelsQuery.isLoading ? <div className="state-panel"><p>正在加载模型配置...</p></div> : null}
    {modelsQuery.isError ? <div className="state-panel"><h2>无法加载生成器</h2><p>{modelsQuery.error.message}</p><button onClick={() => modelsQuery.refetch()}>重新加载</button></div> : null}
    {selectedModel && selectedTask && selectedTemplate ? <div className="generator-layout">
      <section className="generator-form" aria-label="生成配置">
        <label>模型<select aria-label="模型" value={selectedModel.id} onChange={(event) => { setModelId(event.target.value); setTaskId(""); setTemplateId(""); }}>{models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
        <label>任务<select aria-label="任务" value={selectedTask.id} onChange={(event) => { setTaskId(event.target.value); setTemplateId(""); }}>{selectedModel.tasks.map((task) => <option key={task.id} value={task.id}>{task.nameZh}</option>)}</select></label>
        <label>模板<select aria-label="模板" value={selectedTemplate.id} onChange={(event) => setTemplateId(event.target.value)}>{selectedTask.templates.map((template) => <option key={template.id} value={template.id}>{template.nameZh}</option>)}</select></label>
        <label>{inputField?.labelZh ?? "任务要求"}<textarea aria-label="任务要求" value={requirement} onChange={(event) => setRequirement(event.target.value)} placeholder="用中文描述你想生成或修改的内容" rows={8} /></label>
        <fieldset className="skill-picker"><legend>可选 Skill</legend>{skillsQuery.data?.length ? skillsQuery.data.map((skill) => <label key={skill.id}><input type="checkbox" checked={skillIds.includes(skill.id)} onChange={() => toggleSkill(skill.id)} />{skill.nameZh}<span>{skill.category}</span></label>) : <p>此任务暂无可选 Skill</p>}</fieldset>
        <button className="primary-button generator-submit" disabled={!requirement.trim() || compileMutation.isPending} onClick={() => { saveMutation.reset(); retryMutation.reset(); compileMutation.mutate(); }}><Sparkles size={16} />{compileMutation.isPending ? "正在生成" : "生成 Prompt"}</button>
        {compileMutation.isError ? <p className="form-error">{compileMutation.error.message}</p> : null}
      </section>
      <section className="generator-result" aria-live="polite"><header><h2>生成结果</h2>{result ? <span className="result-status">{result.translationStatus === "SUCCEEDED" ? "双语完成" : "等待翻译"}</span> : null}</header>{result ? <div className="result-content"><PromptResult title="中文 Prompt" value={result.contentZh} language="zh" copied={copied} onCopy={copy} /><PromptResult title="English Prompt" value={result.contentEn} language="en" copied={copied} onCopy={copy} /><div className="result-actions"><button className="primary-button" disabled={saveMutation.isPending || saveMutation.isSuccess} onClick={() => saveMutation.mutate()}><Save size={15} />{saveMutation.isPending ? "保存中..." : saveMutation.isSuccess ? "已保存到 Prompt 库" : "保存到 Prompt 库"}</button>{result.translationStatus === "FAILED" ? <button className="secondary-button" disabled={retryMutation.isPending} onClick={() => retryMutation.mutate()}><RefreshCw size={15} />{retryMutation.isPending ? "重试中..." : "重试翻译"}</button> : null}{saveMutation.isError || retryMutation.isError ? <p className="form-error">{(saveMutation.error ?? retryMutation.error)?.message}</p> : null}</div></div> : <div className="state-panel"><Sparkles size={28} /><h2>等待生成</h2><p>填写中文任务要求后，生成符合当前模型的双语 Prompt。</p></div>}</section>
    </div> : null}
  </main>;
}

function PromptResult({ title, value, language, copied, onCopy }: { title: string; value: string | null; language: "zh" | "en"; copied: "zh" | "en" | null; onCopy(language: "zh" | "en", value: string | null): void }) {
  return <section className="prompt-block"><div className="block-heading"><span>{title}</span><button disabled={!value} onClick={() => onCopy(language, value)}>{copied === language ? <Check size={14} /> : <Clipboard size={14} />}复制</button></div><pre>{value || "英文翻译暂不可用"}</pre></section>;
}
