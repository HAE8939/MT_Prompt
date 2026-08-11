import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Clipboard, Grid2X2, Image, List, MoreHorizontal, Plus, Search, SlidersHorizontal, Star, X } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { api, type PromptListResponse, type PromptRecord } from "../../lib/api-client";
import { PromptEditor } from "./PromptEditor";
import { useQueryClient } from "@tanstack/react-query";
import "./library-fixes.css";

function Rating({ value }: { value: number }) {
  return <span className="rating" aria-label={`${value} 星评分`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={13} fill={index < value ? "currentColor" : "none"} />)}</span>;
}

function PromptCard({ prompt, selected, onOpen }: { prompt: PromptRecord; selected: boolean; onOpen(): void }) {
  const cover = prompt.assets.find((asset) => asset.role === "COVER") ?? prompt.assets[0];
  return <button type="button" className={`prompt-card${selected ? " selected" : ""}`} onClick={onOpen} aria-label={`打开${prompt.title}`}>
    <div className="prompt-cover">
      {cover ? <img src={`/api/v1/assets/${cover.id}/content`} alt="" /> : <div className="cover-placeholder"><Image size={28} /><span>{prompt.model.mediaType === "VIDEO" ? "VIDEO" : "IMAGE"}</span></div>}
      {prompt.status === "FAVORITE" ? <span className="favorite"><Star size={14} fill="currentColor" /></span> : null}
    </div>
    <div className="card-body">
      <div className="card-title-row"><h2>{prompt.title}</h2><MoreHorizontal size={15} /></div>
      <div className="model-line"><span className="model-dot" />{prompt.model.name}</div>
      <div className="tag-row">{prompt.tags.slice(0, 3).map((tag) => <span key={tag.id}>{tag.name}</span>)}</div>
      <div className="card-footer"><Rating value={prompt.rating} /><span>{prompt.task.nameZh}</span></div>
    </div>
  </button>;
}

function DetailPanel({ prompt, onClose, onEdit }: { prompt: PromptRecord; onClose(): void; onEdit(): void }) {
  const [copied, setCopied] = useState<"zh" | "en" | null>(null);
  async function copy(language: "zh" | "en") {
    const value = language === "zh" ? prompt.contentZh : prompt.contentEn;
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(language);
    window.setTimeout(() => setCopied(null), 1200);
  }
  return <aside className="detail-panel" aria-label="Prompt 详情">
    <header className="detail-header"><span>Prompt 详情</span><div className="detail-actions"><button className="secondary-button" onClick={onEdit}>编辑 Prompt</button><button className="icon-button" onClick={onClose} aria-label="关闭详情"><X size={16} /></button></div></header>
    <div className="detail-scroll">
      <div className="detail-visual">{(() => { const cover = prompt.assets.find((asset) => asset.role === "COVER") ?? prompt.assets[0]; return cover ? <img className="detail-image" src={`/api/v1/assets/${cover.id}/content`} alt={`${prompt.title}封面`} /> : <div className="cover-placeholder large"><Image size={32} /><span>{prompt.model.mediaType}</span></div>; })()}</div>
      <div className="detail-title"><div><h2>{prompt.title}</h2><p>{prompt.description || "暂无说明"}</p></div><Rating value={prompt.rating} /></div>
      <dl className="metadata"><div><dt>模型</dt><dd>{prompt.model.name}</dd></div><div><dt>任务</dt><dd>{prompt.task.nameZh}</dd></div></dl>
      <div className="tag-row detail-tags">{prompt.tags.map((tag) => <span key={tag.id}>{tag.name}</span>)}</div>
      <section className="prompt-block"><div className="block-heading"><span>中文 Prompt</span><button onClick={() => copy("zh")}>{copied === "zh" ? <Check size={14} /> : <Clipboard size={14} />}复制</button></div><pre>{prompt.contentZh}</pre></section>
      <section className="prompt-block"><div className="block-heading"><span>English Prompt</span><button onClick={() => copy("en")} disabled={!prompt.contentEn}>{copied === "en" ? <Check size={14} /> : <Clipboard size={14} />}复制</button></div><pre>{prompt.contentEn || "尚未生成英文版本"}</pre></section>
    </div>
  </aside>;
}

export function LibraryPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PromptRecord | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState<"ALL" | "IMAGE" | "VIDEO" | "FAVORITE">("ALL");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PromptRecord | null>(null);
  const queryClient = useQueryClient();
  const deferredSearch = useDeferredValue(search);
  const query = useQuery({
    queryKey: ["prompts", deferredSearch, filter],
    queryFn: () => api<PromptListResponse>(`/prompts?keyword=${encodeURIComponent(deferredSearch)}&page=1&limit=40${filter === "IMAGE" || filter === "VIDEO" ? `&mediaType=${filter}` : filter === "FAVORITE" ? "&status=FAVORITE" : ""}`),
  });
  const visiblePrompts = query.data?.data.filter((prompt) => filter === "ALL" || (filter === "IMAGE" ? prompt.model.mediaType === "IMAGE" : filter === "VIDEO" ? prompt.model.mediaType === "VIDEO" : prompt.status === "FAVORITE")) ?? [];
  function chooseFilter(value: typeof filter) { setFilter(value); setSelected(null); }

  return <div className={`library-layout${selected ? " with-detail" : ""}`}>
    <main className="library-main">
      <header className="page-header"><div><h1>Prompt 库</h1><span className="count">{query.data?.total ?? 0} 个资产</span></div><button className="primary-button" onClick={() => setCreating(true)}><Plus size={16} />新建 Prompt</button></header>
      <div className="search-wrap"><Search size={17} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索 Prompt、标签、模型..." aria-label="搜索 Prompt" /><kbd>Ctrl K</kbd></div>
      <div className="filter-bar">
        <div className="segments"><button className={filter === "ALL" ? "active" : ""} onClick={() => chooseFilter("ALL")}>全部</button><button className={filter === "IMAGE" ? "active" : ""} onClick={() => chooseFilter("IMAGE")}>图片</button><button className={filter === "VIDEO" ? "active" : ""} onClick={() => chooseFilter("VIDEO")}>视频</button><button className={filter === "FAVORITE" ? "active" : ""} onClick={() => chooseFilter("FAVORITE")}>收藏</button></div>
        <div className="filter-actions"><button><SlidersHorizontal size={15} />筛选</button><button>最近更新<ChevronDown size={14} /></button><div className="view-toggle"><button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} aria-label="网格视图"><Grid2X2 size={15} /></button><button className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-label="列表视图"><List size={16} /></button></div></div>
      </div>
      {query.isLoading ? <div className="loading-grid">{Array.from({ length: 8 }, (_, index) => <div key={index} className="skeleton" />)}</div> : null}
      {query.isError ? <div className="state-panel"><h2>无法读取 Prompt 库</h2><p>{query.error.message}</p><button onClick={() => query.refetch()}>重新加载</button></div> : null}
      {visiblePrompts.length === 0 ? <div className="state-panel empty"><Image size={32} /><h2>{search || filter !== "ALL" ? "没有匹配结果" : "Prompt 库还是空的"}</h2><p>{search || filter !== "ALL" ? "尝试切换分类或清除搜索。" : "新建第一个 Prompt，或从生成器保存结果。"}</p></div> : null}
      {visiblePrompts.length ? <div className={view === "grid" ? "prompt-grid" : "prompt-list"}>{visiblePrompts.map((prompt) => <PromptCard key={prompt.id} prompt={prompt} selected={selected?.id === prompt.id} onOpen={() => setSelected(prompt)} />)}</div> : null}
    </main>
    {selected ? <DetailPanel prompt={selected} onClose={() => setSelected(null)} onEdit={() => setEditing(selected)} /> : null}
    {creating ? <PromptEditor onClose={() => setCreating(false)} onSaved={(prompt) => { setCreating(false); setSelected(prompt); void queryClient.invalidateQueries({ queryKey: ["prompts"] }); }} /> : null}
    {editing ? <PromptEditor prompt={editing} onClose={() => setEditing(null)} onSaved={(prompt) => { setEditing(null); setSelected(prompt); void queryClient.invalidateQueries({ queryKey: ["prompts"] }); }} /> : null}
  </div>;
}
