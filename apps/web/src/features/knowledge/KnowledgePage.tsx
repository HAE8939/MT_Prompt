import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Layers, Pencil, Plus, ShieldCheck, Wrench, X } from "lucide-react";
import { useState } from "react";
import { api } from "../../lib/api-client";
import "./knowledge.css";

type Owner = "BUILT_IN" | "USER";
type Template = { id: string; modelTaskId?: string; nameZh: string; nameEn?: string; templateZh?: string; templateEn?: string; fieldSchema?: { fields: unknown[] }; enabled?: boolean; owner?: Owner; version?: number };
type Task = { id: string; nameZh: string; templates: Template[] };
type Model = { id: string; name: string; tasks: Task[] };
type Skill = { id: string; nameZh: string; nameEn: string; contentZh: string; contentEn: string; category: string; priority: number; conflictGroup: string | null; enabled: boolean; owner: Owner; version: number; modelTaskIds: string[] };
type Rule = { id: string; modelTaskId?: string | null; nameZh: string; nameEn: string; contentZh: string; contentEn: string; priority: number; enabled: boolean; owner: Owner; version: number };
type EditorState = { kind: "skill"; item?: Skill } | { kind: "template"; item: Template; taskId: string } | { kind: "rule"; item?: Rule };

export function KnowledgePage() {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const modelsQuery = useQuery({ queryKey: ["models"], queryFn: () => api<Model[]>("/models") });
  const skillsQuery = useQuery({ queryKey: ["skills-management"], queryFn: () => api<{ data: Skill[] }>("/skills?includeDisabled=true").then((response) => response.data) });
  const rulesQuery = useQuery({ queryKey: ["rules-management"], queryFn: () => api<Rule[]>("/personal-rules?includeDisabled=true") });
  const tasks = (modelsQuery.data ?? []).flatMap((model) => model.tasks);
  const saveMutation = useMutation({
    mutationFn: ({ state, payload }: { state: EditorState; payload: Record<string, unknown> }) => {
      const collection = state.kind === "skill" ? "skills" : state.kind === "template" ? "templates" : "personal-rules";
      const item = state.item;
      return api(`/${collection}${item ? `/${item.id}` : ""}`, { method: item ? "PATCH" : "POST", body: JSON.stringify(payload) });
    },
    onSuccess: async () => {
      setEditor(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["models"] }),
        queryClient.invalidateQueries({ queryKey: ["skills-management"] }),
        queryClient.invalidateQueries({ queryKey: ["rules-management"] }),
      ]);
    },
  });

  return <main className="knowledge-page">
    <header className="page-header"><div><h1>模板与技能</h1><span className="count">内置知识与本地扩展</span></div></header>
    <section className="knowledge-section"><header><Layers size={16} /><h2>模型任务与模板</h2></header>{modelsQuery.isLoading ? <div className="state-panel"><p>正在加载模板...</p></div> : null}{modelsQuery.data?.map((model) => <div className="model-knowledge" key={model.id}><h3>{model.name}</h3><div className="task-list">{model.tasks.map((task) => <article key={task.id}><strong>{task.nameZh}</strong><div>{task.templates.map((template) => <span className="knowledge-chip" key={template.id}>{template.nameZh}<button className="chip-action" aria-label={`编辑 ${template.nameZh}`} onClick={() => setEditor({ kind: "template", item: template, taskId: task.id })}><Pencil size={11} /></button></span>)}</div></article>)}</div></div>)}</section>
    <section className="knowledge-section"><header><Wrench size={16} /><h2>Prompt Skills</h2><button className="section-action" onClick={() => setEditor({ kind: "skill" })}><Plus size={13} />新建 Skill</button></header>{skillsQuery.isLoading ? <div className="state-panel"><p>正在加载 Skill...</p></div> : null}{skillsQuery.data?.length ? <div className="skill-catalog">{skillsQuery.data.map((skill) => <article className={!skill.enabled ? "disabled-item" : ""} key={skill.id}><BookOpen size={15} /><div><h3>{skill.nameZh}</h3><p>{skill.category} · v{skill.version}</p><span className={`owner-label ${skill.owner === "USER" ? "user" : ""}`}>{skill.owner === "USER" ? "用户副本" : "内置"}</span></div><button className="icon-button item-action" aria-label={`编辑 ${skill.nameZh}`} onClick={() => setEditor({ kind: "skill", item: skill })}><Pencil size={13} /></button></article>)}</div> : <div className="state-panel"><p>尚未创建 Skill。</p></div>}</section>
    <section className="knowledge-section"><header><ShieldCheck size={16} /><h2>个人规则</h2><button className="section-action" onClick={() => setEditor({ kind: "rule" })}><Plus size={13} />新建个人规则</button></header>{Array.isArray(rulesQuery.data) && rulesQuery.data.length ? <div className="skill-catalog">{rulesQuery.data.map((rule) => <article className={!rule.enabled ? "disabled-item" : ""} key={rule.id}><ShieldCheck size={15} /><div><h3>{rule.nameZh}</h3><p>优先级 {rule.priority} · v{rule.version}</p><span className={`owner-label ${rule.owner === "USER" ? "user" : ""}`}>{rule.owner === "USER" ? "用户副本" : "内置"}</span></div><button className="icon-button item-action" aria-label={`编辑 ${rule.nameZh}`} onClick={() => setEditor({ kind: "rule", item: rule })}><Pencil size={13} /></button></article>)}</div> : <div className="state-panel compact-state"><p>尚未配置个人规则。</p></div>}</section>
    {editor ? <KnowledgeEditor key={`${editor.kind}-${editor.item?.id ?? "new"}`} state={editor} tasks={tasks} pending={saveMutation.isPending} error={saveMutation.error?.message} onClose={() => setEditor(null)} onSave={(payload) => saveMutation.mutate({ state: editor, payload })} /> : null}
  </main>;
}

function KnowledgeEditor({ state, tasks, pending, error, onClose, onSave }: { state: EditorState; tasks: Task[]; pending: boolean; error?: string; onClose(): void; onSave(payload: Record<string, unknown>): void }) {
  const item = state.item;
  const [nameZh, setNameZh] = useState(item?.nameZh ?? "");
  const [nameEn, setNameEn] = useState(item?.nameEn ?? "");
  const [contentZh, setContentZh] = useState(state.kind === "template" ? state.item.templateZh ?? "" : state.item?.contentZh ?? "");
  const [contentEn, setContentEn] = useState(state.kind === "template" ? state.item.templateEn ?? "" : state.item?.contentEn ?? "");
  const [priority, setPriority] = useState(state.kind === "template" ? 100 : state.item?.priority ?? (state.kind === "rule" ? 1000 : 100));
  const [category, setCategory] = useState(state.kind === "skill" ? state.item?.category ?? "CUSTOM" : "");
  const [enabled, setEnabled] = useState(item?.enabled ?? true);
  const [modelTaskIds, setModelTaskIds] = useState<string[]>(state.kind === "skill" ? state.item?.modelTaskIds ?? (tasks[0] ? [tasks[0].id] : []) : []);
  const [modelTaskId, setModelTaskId] = useState(state.kind === "rule" ? state.item?.modelTaskId ?? "" : state.kind === "template" ? state.taskId : "");
  const valid = Boolean(nameZh.trim() && nameEn.trim() && contentZh.trim() && contentEn.trim() && (state.kind !== "skill" || modelTaskIds.length));
  function submit() {
    if (state.kind === "skill") onSave({ nameZh, nameEn, contentZh, contentEn, category, priority, conflictGroup: state.item?.conflictGroup ?? null, modelTaskIds, enabled });
    else if (state.kind === "template") onSave({ modelTaskId, nameZh, nameEn, templateZh: contentZh, templateEn: contentEn, fieldSchema: state.item.fieldSchema ?? { fields: [] }, enabled });
    else onSave({ modelTaskId: modelTaskId || null, nameZh, nameEn, contentZh, contentEn, priority, enabled });
  }
  return <div className="modal-backdrop" role="presentation"><section className="modal knowledge-modal" role="dialog" aria-modal="true" aria-labelledby="knowledge-editor-title"><header><div><h2 id="knowledge-editor-title">{item ? "编辑" : "新建"}{state.kind === "skill" ? " Skill" : state.kind === "template" ? "模板" : "个人规则"}</h2><p>{item?.owner === "BUILT_IN" ? "保存后将创建用户副本，内置内容不会改变。" : "中英文内容会一同进入 Prompt 编译器。"}</p></div><button className="icon-button" aria-label="关闭" onClick={onClose}><X size={15} /></button></header><form onSubmit={(event) => { event.preventDefault(); submit(); }}><div className="editor-grid"><label>中文名称<input aria-label="中文名称" value={nameZh} onChange={(event) => setNameZh(event.target.value)} /></label><label>英文名称<input aria-label="英文名称" value={nameEn} onChange={(event) => setNameEn(event.target.value)} /></label></div><label>中文内容<textarea aria-label="中文内容" rows={7} value={contentZh} onChange={(event) => setContentZh(event.target.value)} /></label><label>英文内容<textarea aria-label="英文内容" rows={7} value={contentEn} onChange={(event) => setContentEn(event.target.value)} /></label>{state.kind === "skill" ? <><div className="editor-grid"><label>分类<input value={category} onChange={(event) => setCategory(event.target.value)} /></label><label>优先级<input type="number" value={priority} onChange={(event) => setPriority(Number(event.target.value))} /></label></div><fieldset className="task-compatibility"><legend>适用任务</legend>{tasks.map((task) => <label key={task.id}><input type="checkbox" checked={modelTaskIds.includes(task.id)} onChange={() => setModelTaskIds((current) => current.includes(task.id) ? current.filter((id) => id !== task.id) : [...current, task.id])} />{task.nameZh}</label>)}</fieldset></> : state.kind === "rule" ? <div className="editor-grid"><label>适用任务<select value={modelTaskId} onChange={(event) => setModelTaskId(event.target.value)}><option value="">全部任务</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.nameZh}</option>)}</select></label><label>优先级<input type="number" value={priority} onChange={(event) => setPriority(Number(event.target.value))} /></label></div> : null}<label className="enabled-toggle"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />启用</label>{error ? <p className="form-error">{error}</p> : null}<footer><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="primary-button" disabled={!valid || pending}>{pending ? "保存中..." : "保存知识"}</button></footer></form></section></div>;
}
