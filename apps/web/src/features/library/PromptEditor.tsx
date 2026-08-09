import { useMutation, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";
import { api, type PromptRecord } from "../../lib/api-client";

type Model = { id: string; name: string; tasks: Array<{ id: string; nameZh: string }> };

export function PromptEditor({ onClose, onCreated }: { onClose(): void; onCreated(prompt: PromptRecord): void }) {
  const models = useQuery({ queryKey: ["models"], queryFn: () => api<Model[]>("/models") });
  const firstTask = models.data?.[0]?.tasks[0]?.id ?? "";
  const [title, setTitle] = useState("");
  const [contentZh, setContentZh] = useState("");
  const [modelTaskId, setModelTaskId] = useState("");
  const mutation = useMutation({
    mutationFn: () => api<PromptRecord>("/prompts", { method: "POST", body: JSON.stringify({ title, contentZh, modelTaskId: modelTaskId || firstTask }) }),
    onSuccess: onCreated,
  });

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="new-prompt-title">
      <header><div><h2 id="new-prompt-title">新建 Prompt</h2><p>先保存核心内容，图片和标签可在详情中补充。</p></div><button className="icon-button" onClick={onClose} aria-label="关闭"><X size={16} /></button></header>
      <form onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
        <label>标题<input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={160} autoFocus /></label>
        <label>模型与任务<select value={modelTaskId || firstTask} onChange={(event) => setModelTaskId(event.target.value)} required>{models.data?.flatMap((model) => model.tasks.map((task) => <option key={task.id} value={task.id}>{model.name} · {task.nameZh}</option>))}</select></label>
        <label>中文 Prompt<textarea value={contentZh} onChange={(event) => setContentZh(event.target.value)} required rows={9} /></label>
        {mutation.isError ? <p className="form-error">{mutation.error.message}</p> : null}
        <footer><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={mutation.isPending || !firstTask}>{mutation.isPending ? "保存中..." : "保存 Prompt"}</button></footer>
      </form>
    </section>
  </div>;
}
