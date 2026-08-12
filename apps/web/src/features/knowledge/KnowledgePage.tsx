import { Pencil, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { KnowledgeKind, KnowledgeRecord } from "../../domain/types";
import { useVault } from "../../vault/VaultProvider";
import "./knowledge.css";

const labels: Record<KnowledgeKind, string> = { TEMPLATE: "模板", SKILL: "Skill", RULE: "个人规则" };

function KnowledgeEditor({ kind, record, onClose, onSave }: { kind: KnowledgeKind; record?: KnowledgeRecord; onClose(): void; onSave(record: KnowledgeRecord): Promise<void> }) {
  const [nameZh, setNameZh] = useState(record?.nameZh ?? ""); const [nameEn, setNameEn] = useState(record?.nameEn ?? "");
  const [contentZh, setContentZh] = useState(record?.contentZh ?? ""); const [contentEn, setContentEn] = useState(record?.contentEn ?? "");
  const [category, setCategory] = useState(record?.category ?? (kind === "RULE" ? "constraints" : "modification")); const [priority, setPriority] = useState(record?.priority ?? 10); const [pending, setPending] = useState(false);
  async function submit() { setPending(true); await onSave({ id: record?.id ?? crypto.randomUUID(), stableKey: record?.stableKey ?? `${kind.toLowerCase()}.user.${crypto.randomUUID()}`, kind, owner: record?.owner ?? "USER", nameZh: nameZh.trim(), nameEn: nameEn.trim(), contentZh: contentZh.trim(), contentEn: contentEn.trim(), enabled: record?.enabled ?? true, version: record?.version ?? 1, priority, category, updatedAt: new Date().toISOString() }); setPending(false); }
  return <div className="modal-backdrop"><section className="modal knowledge-modal" role="dialog" aria-modal="true"><header><div><h2>{record ? "编辑" : "新建"}{labels[kind]}</h2>{record?.owner === "BUILT_IN" ? <p>保存会创建用户副本，内置内容保持不变。</p> : null}</div><button className="icon-button" aria-label="关闭" onClick={onClose}><X size={15} /></button></header><form onSubmit={(event) => { event.preventDefault(); void submit(); }}><div className="editor-grid"><label>中文名称<input value={nameZh} onChange={(event) => setNameZh(event.target.value)} /></label><label>英文名称<input value={nameEn} onChange={(event) => setNameEn(event.target.value)} /></label></div><label>中文内容<textarea aria-label="中文内容" rows={7} value={contentZh} onChange={(event) => setContentZh(event.target.value)} /></label><label>英文内容<textarea rows={7} value={contentEn} onChange={(event) => setContentEn(event.target.value)} /></label><div className="editor-grid"><label>分类<input value={category} onChange={(event) => setCategory(event.target.value)} /></label><label>优先级<input type="number" value={priority} onChange={(event) => setPriority(Number(event.target.value))} /></label></div><footer><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={pending || !nameZh.trim() || !nameEn.trim() || !contentZh.trim() || !contentEn.trim()}>保存知识</button></footer></form></section></div>;
}

export function KnowledgePage() {
  const { knowledge } = useVault(); const [records, setRecords] = useState<KnowledgeRecord[]>([]); const [kind, setKind] = useState<KnowledgeKind>("TEMPLATE"); const [editor, setEditor] = useState<KnowledgeRecord | "new">(); const [search, setSearch] = useState("");
  async function reload() { setRecords(await knowledge.list()); }
  useEffect(() => { void reload(); }, [knowledge]);
  const visible = useMemo(() => records.filter((record) => record.kind === kind && (!search.trim() || [record.nameZh, record.nameEn, record.contentZh, record.contentEn].some((value) => value.toLocaleLowerCase("zh-CN").includes(search.trim().toLocaleLowerCase("zh-CN"))))), [records, kind, search]);
  return <main className="knowledge-page"><header className="page-header"><div><h1>模板与技能</h1><span className="count">当前浏览器的本地知识库</span></div><button className="primary-button" onClick={() => setEditor("new")}><Plus size={14} />新建{labels[kind]}</button></header>
    <div className="knowledge-toolbar"><div className="segments">{(["TEMPLATE", "SKILL", "RULE"] as const).map((value) => <button className={kind === value ? "active" : ""} key={value} onClick={() => setKind(value)}>{labels[value]}</button>)}</div><input aria-label="搜索知识" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索名称或内容" /></div>
    <div className="knowledge-list">{visible.map((record) => <article className={!record.enabled ? "disabled-item" : ""} key={record.id}><div><h2>{record.nameZh}</h2><p>{record.nameEn} · {record.category} · v{record.version}</p></div><span className={`owner-label ${record.owner === "USER" ? "user" : ""}`}>{record.owner === "USER" ? "用户副本" : "内置"}</span><label className="enabled-toggle"><input type="checkbox" checked={record.enabled} onChange={async (event) => { await knowledge.save({ ...record, enabled: event.target.checked, updatedAt: new Date().toISOString() }); await reload(); }} />启用</label><button className="icon-button" aria-label={`编辑 ${record.nameZh}`} onClick={() => setEditor(record)}><Pencil size={14} /></button></article>)}</div>
    {!visible.length ? <div className="state-panel"><p>当前分类没有匹配的记录。</p></div> : null}
    {editor ? <KnowledgeEditor kind={kind} record={editor === "new" ? undefined : editor} onClose={() => setEditor(undefined)} onSave={async (record) => { await knowledge.save(record); setEditor(undefined); await reload(); }} /> : null}
  </main>;
}
