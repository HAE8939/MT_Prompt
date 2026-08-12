import { Download, FileUp, Grid2X2, Image, List, Plus, Search, Star, Trash2, Upload, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { PromptAsset, PromptRecord } from "../../domain/types";
import { exportPromptPackage } from "../../transfer/export-prompt";
import { applyPromptImport, previewPromptImport, type PromptImportPreview } from "../../transfer/import-prompt";
import { useVault } from "../../vault/VaultProvider";
import { blobBytes, sha256 } from "../../transfer/hash";
import "./library-fixes.css";

type Filter = "ALL" | "IMAGE" | "VIDEO" | "FAVORITE";

function useAssetUrl(asset?: PromptAsset) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!asset) { setUrl(""); return; }
    const next = URL.createObjectURL(asset.blob); setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [asset]);
  return url;
}

function PromptRow({ prompt, assets, view, onOpen }: { prompt: PromptRecord; assets: PromptAsset[]; view: "list" | "grid"; onOpen(): void }) {
  const cover = assets.find(({ role }) => role === "COVER") ?? assets[0];
  const coverUrl = useAssetUrl(cover);
  return <button className={`prompt-card local-prompt-card ${view}`} onClick={onOpen} aria-label={`打开${prompt.title}`}>
    <div className="prompt-cover">{coverUrl ? (cover?.mimeType.startsWith("video/") ? <video src={coverUrl} muted /> : <img src={coverUrl} alt="" />) : <div className="cover-placeholder"><Image size={22} /><span>{prompt.mediaType}</span></div>}</div>
    <div className="card-body"><div className="card-title-row"><h2>{prompt.title}</h2>{prompt.favorite ? <Star size={14} fill="currentColor" /> : null}</div><p>{prompt.description || prompt.contentZh}</p><div className="card-footer"><span>{prompt.category}</span><span>{new Date(prompt.updatedAt).toLocaleDateString("zh-CN")}</span></div></div>
  </button>;
}

function PromptDetail({ prompt, assets, onClose, onEdit }: { prompt: PromptRecord; assets: PromptAsset[]; onClose(): void; onEdit(): void }) {
  const cover = assets.find(({ role }) => role === "COVER") ?? assets[0];
  const coverUrl = useAssetUrl(cover);
  return <aside className="detail-panel" aria-label="Prompt 详情"><header className="detail-header"><strong>Prompt 详情</strong><div className="detail-actions"><button className="secondary-button" onClick={onEdit}>编辑 Prompt</button><button className="icon-button" aria-label="关闭详情" onClick={onClose}><X size={16} /></button></div></header><div className="detail-scroll">
    <div className="detail-visual">{coverUrl ? (cover?.mimeType.startsWith("video/") ? <video className="detail-image" src={coverUrl} controls /> : <img className="detail-image" src={coverUrl} alt={`${prompt.title}封面`} />) : <div className="cover-placeholder large"><Image size={30} /><span>{prompt.mediaType}</span></div>}</div>
    <div className="detail-title"><div><h2>{prompt.title}</h2><p>{prompt.description || "暂无说明"}</p></div></div>
    <div className="tag-row detail-tags">{prompt.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
    <section className="prompt-block"><div className="block-heading"><span>中文 Prompt</span></div><pre>{prompt.contentZh}</pre></section>
    <section className="prompt-block"><div className="block-heading"><span>English Prompt</span></div><pre>{prompt.contentEn}</pre></section>
    {prompt.provenance ? <section className="detail-section"><h3>生成来源</h3><p>{prompt.provenance.template?.nameZh ?? "自定义模板"} · {prompt.provenance.compilerVersion}</p></section> : null}
  </div></aside>;
}

const MEDIA_TYPES = /^(image\/(png|jpeg|webp|gif)|video\/(mp4|webm))$/;

function PromptEditor({ prompt, assets: initialAssets = [], onClose, onSave }: { prompt?: PromptRecord; assets?: PromptAsset[]; onClose(): void; onSave(record: PromptRecord, assets: PromptAsset[], removedAssetIds: string[]): Promise<void> }) {
  const [title, setTitle] = useState(prompt?.title ?? ""); const [description, setDescription] = useState(prompt?.description ?? "");
  const [contentZh, setContentZh] = useState(prompt?.contentZh ?? ""); const [contentEn, setContentEn] = useState(prompt?.contentEn ?? "");
  const [mediaType, setMediaType] = useState<"IMAGE" | "VIDEO">(prompt?.mediaType ?? "IMAGE"); const [pending, setPending] = useState(false);
  const [assets, setAssets] = useState<PromptAsset[]>(initialAssets); const [removed, setRemoved] = useState<string[]>([]); const [error, setError] = useState("");
  async function addFiles(files: FileList | null) { if (!files || !prompt) return; setError(""); const next: PromptAsset[] = []; for (const file of Array.from(files)) { if (!MEDIA_TYPES.test(file.type)) { setError("仅支持 PNG、JPEG、WebP、GIF、MP4、WebM 素材。"); continue; } const bytes = await blobBytes(file); next.push({ id: crypto.randomUUID(), promptId: prompt.id, role: assets.length + next.length ? "REFERENCE" : "COVER", blob: file, mimeType: file.type, originalName: file.name, byteSize: file.size, checksum: await sha256(bytes), createdAt: new Date().toISOString() }); } setAssets((current) => [...current, ...next]); }
  async function submit() { const now = new Date().toISOString(); setPending(true); await onSave({ id: prompt?.id ?? crypto.randomUUID(), title: title.trim(), description: description.trim(), contentZh: contentZh.trim(), contentEn: contentEn.trim(), negativeZh: prompt?.negativeZh ?? "", negativeEn: prompt?.negativeEn ?? "", mediaType, category: prompt?.category ?? "通用", tags: prompt?.tags ?? [], favorite: prompt?.favorite ?? false, rating: prompt?.rating ?? 0, origin: prompt?.origin ?? "MANUAL", provenance: prompt?.provenance, createdAt: prompt?.createdAt ?? now, updatedAt: now }, assets, removed); setPending(false); }
  return <div className="modal-backdrop"><section className="modal prompt-editor" role="dialog" aria-modal="true"><header><h2>{prompt ? "编辑 Prompt" : "新建 Prompt"}</h2><button className="icon-button" aria-label="关闭" onClick={onClose}><X size={16} /></button></header><form onSubmit={(event) => { event.preventDefault(); void submit(); }}><label>标题<input aria-label="标题" value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>说明<input value={description} onChange={(event) => setDescription(event.target.value)} /></label><label>类型<select value={mediaType} onChange={(event) => setMediaType(event.target.value as "IMAGE" | "VIDEO")}><option value="IMAGE">图片</option><option value="VIDEO">视频</option></select></label><label>中文 Prompt<textarea aria-label="中文 Prompt" rows={8} value={contentZh} onChange={(event) => setContentZh(event.target.value)} /></label><label>English Prompt<textarea rows={8} value={contentEn} onChange={(event) => setContentEn(event.target.value)} /></label>{prompt ? <div className="asset-editor"><div className="asset-editor-heading"><span>关联素材</span><label className="secondary-button asset-add-button"><Upload size={14} />添加素材<input aria-label="添加图片或视频素材" type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" multiple onChange={(event) => void addFiles(event.target.files)} /></label></div>{assets.map((asset) => <div className="asset-row" key={asset.id}><span>{asset.originalName}</span><button type="button" className="icon-button" aria-label={`删除素材 ${asset.originalName}`} onClick={() => { setAssets((current) => current.filter(({ id }) => id !== asset.id)); if (initialAssets.some(({ id }) => id === asset.id)) setRemoved((current) => [...current, asset.id]); }}><Trash2 size={14} /></button></div>)}{error ? <p className="form-error">{error}</p> : null}</div> : null}<footer><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={!title.trim() || !contentZh.trim() || pending}>{prompt ? "保存修改" : "保存 Prompt"}</button></footer></form></section></div>;
}

export function LibraryPage() {
  const vault = useVault(); const [records, setRecords] = useState<PromptRecord[]>([]); const [assets, setAssets] = useState<Record<string, PromptAsset[]>>({});
  const [search, setSearch] = useState(""); const deferredSearch = useDeferredValue(search); const [filter, setFilter] = useState<Filter>("ALL"); const [view, setView] = useState<"list" | "grid">("list");
  const [selectedId, setSelectedId] = useState<string>(); const [editor, setEditor] = useState<PromptRecord | "new">(); const [importPreview, setImportPreview] = useState<PromptImportPreview>(); const [message, setMessage] = useState("");
  async function reload() { const next = await vault.prompts.list({ keyword: deferredSearch, mediaType: filter === "IMAGE" || filter === "VIDEO" ? filter : undefined, favorite: filter === "FAVORITE" ? true : undefined, sort: "updatedAt", order: "desc" }); setRecords(next); const pairs = await Promise.all(next.map(async ({ id }) => [id, await vault.prompts.listAssets(id)] as const)); setAssets(Object.fromEntries(pairs)); }
  useEffect(() => { void reload(); }, [deferredSearch, filter]);
  const selected = useMemo(() => records.find(({ id }) => id === selectedId), [records, selectedId]);
  async function exportVisible() { const allAssets = records.flatMap(({ id }) => assets[id] ?? []); const blob = await exportPromptPackage({ prompts: records, assets: allAssets }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `mt-prompt-${new Date().toISOString().slice(0, 10)}.prompt`; link.click(); URL.revokeObjectURL(url); }
  async function chooseImport(file?: File) { if (!file) return; const preview = await previewPromptImport(file, vault); setImportPreview(preview); setMessage(`可导入 ${preview.promptActions.filter(({ action }) => action !== "SKIP").length} 条，冲突副本 ${preview.promptActions.filter(({ action }) => action === "COPY").length} 条。`); }
  return <div className={`library-layout${selected ? " with-detail" : ""}`}><main className="library-main"><header className="page-header"><div><h1>Prompt 库</h1><span className="count">{records.length} 个本地资产</span></div><div className="library-header-actions"><label role="button" aria-label="导入 .prompt" tabIndex={0} className="secondary-button import-button"><FileUp size={15} />导入 .prompt<input aria-label="选择 .prompt 文件" type="file" accept=".prompt,application/zip" onChange={(event) => void chooseImport(event.target.files?.[0])} /></label><button className="secondary-button" disabled={!records.length} onClick={() => void exportVisible()}><Download size={15} />导出</button><button className="primary-button" onClick={() => setEditor("new")}><Plus size={15} />新建 Prompt</button></div></header>
    <div className="search-wrap"><Search size={17} /><input aria-label="搜索 Prompt" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索 Prompt、标签、内容" /></div>
    <div className="filter-bar"><div className="segments">{(["ALL", "IMAGE", "VIDEO", "FAVORITE"] as const).map((value) => <button key={value} className={filter === value ? "active" : ""} onClick={() => { setFilter(value); setSelectedId(undefined); }}>{({ ALL: "全部", IMAGE: "图片", VIDEO: "视频", FAVORITE: "收藏" })[value]}</button>)}</div><div className="view-toggle"><button aria-label="列表视图" className={view === "list" ? "active" : ""} onClick={() => setView("list")}><List size={16} /></button><button aria-label="网格视图" className={view === "grid" ? "active" : ""} onClick={() => setView("grid")}><Grid2X2 size={15} /></button></div></div>
    {message ? <div className="import-summary" role="status"><span>{message}</span>{importPreview ? <><button className="primary-button" onClick={async () => { await applyPromptImport(importPreview, { includeSettings: false, includeKnowledge: false }, vault); setImportPreview(undefined); setMessage("导入完成。"); await reload(); }}>确认导入</button><button className="icon-button" aria-label="关闭导入提示" onClick={() => { setImportPreview(undefined); setMessage(""); }}><X size={14} /></button></> : null}</div> : null}
    {records.length ? <div className={view === "grid" ? "prompt-grid" : "prompt-list"}>{records.map((prompt) => <PromptRow key={prompt.id} prompt={prompt} assets={assets[prompt.id] ?? []} view={view} onOpen={() => setSelectedId(prompt.id)} />)}</div> : <div className="state-panel empty"><Image size={30} /><h2>这里还没有匹配的 Prompt</h2><p>切换分类、清除搜索，或新建一条 Prompt。</p></div>}
  </main>{selected ? <PromptDetail prompt={selected} assets={assets[selected.id] ?? []} onClose={() => setSelectedId(undefined)} onEdit={() => setEditor(selected)} /> : null}
  {editor ? <PromptEditor prompt={editor === "new" ? undefined : editor} assets={editor === "new" ? [] : assets[editor.id] ?? []} onClose={() => setEditor(undefined)} onSave={async (record, nextAssets, removedAssetIds) => { if (editor === "new") await vault.prompts.create(record, nextAssets); else { await vault.prompts.update(record.id, record, "编辑 Prompt"); for (const assetId of removedAssetIds) await vault.prompts.removeAsset(assetId); const existing = new Set((assets[record.id] ?? []).map(({ id }) => id)); for (const asset of nextAssets) if (!existing.has(asset.id)) await vault.prompts.addAsset(asset); } setEditor(undefined); setSelectedId(record.id); await reload(); }} /> : null}</div>;
}
