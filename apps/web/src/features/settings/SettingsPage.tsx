import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, CheckCircle2, DatabaseBackup, Download, KeyRound, PlugZap, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { api } from "../../lib/api-client";
import "./settings.css";

type Provider = "openai" | "microsoft";
type SettingsStatus = { translation: { provider: Provider | null; configured: boolean; model: string | null; endpoint?: string | null; region?: string | null } };
type ExportResult = { filename: string; downloadUrl: string };
type AiStatus = { configured: boolean; baseUrl: string | null; model: string | null };
type IntegrityReport = { checkedAt: string; assetCount: number; missingFiles: string[]; orphanFiles: string[] };
type ImportValidation = { valid: true; schemaVersion: number; promptCount: number; assetCount: number; missingAssets: string[]; conflicts: string[] };
type ImportResult = { mode: "MERGE" | "REPLACE"; promptCount: number; restoredAssets: number; conflicts: string[]; missingAssets: string[] };

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState<Provider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-5-mini");
  const [endpoint, setEndpoint] = useState("https://api.cognitive.microsofttranslator.com");
  const [region, setRegion] = useState("");
  const [aiBaseUrl, setAiBaseUrl] = useState("https://lanfengai.cn");
  const [aiModel, setAiModel] = useState("deepseek-v4-flash");
  const [aiApiKey, setAiApiKey] = useState("");
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const statusQuery = useQuery({ queryKey: ["settings-status"], queryFn: () => api<SettingsStatus>("/settings/status") });
  const saveMutation = useMutation({
    mutationFn: () => api<void>("/settings/translation-provider", {
      method: "PUT",
      body: JSON.stringify({ provider, apiKey, model, ...(provider === "microsoft" ? { endpoint, region } : {}) }),
    }),
    onSuccess: async () => {
      setApiKey("");
      await queryClient.invalidateQueries({ queryKey: ["settings-status"] });
    },
  });
  const testMutation = useMutation({ mutationFn: () => api<void>("/settings/translation-provider/test", { method: "POST" }) });
  const exportMutation = useMutation({ mutationFn: () => api<ExportResult>("/exports", { method: "POST" }) });
  const aiStatusQuery = useQuery({ queryKey: ["ai-provider-status"], queryFn: () => api<AiStatus>("/settings/ai-provider/status") });
  const saveAiMutation = useMutation({ mutationFn: () => api<void>("/settings/ai-provider", { method: "PUT", body: JSON.stringify({ baseUrl: aiBaseUrl, model: aiModel, apiKey: aiApiKey }) }), onSuccess: async () => { setAiApiKey(""); await queryClient.invalidateQueries({ queryKey: ["ai-provider-status"] }); } });
  const testAiMutation = useMutation({ mutationFn: () => api<void>("/settings/ai-provider/test", { method: "POST" }) });
  const integrityQuery = useQuery({ queryKey: ["integrity"], queryFn: () => api<IntegrityReport>("/integrity"), enabled: false });
  const validateImportMutation = useMutation({ mutationFn: () => { if (!backupFile) throw new Error("请选择 ZIP 备份。"); const body = new FormData(); body.append("file", backupFile); return api<ImportValidation>("/imports/validate", { method: "POST", body }); } });
  const restoreImportMutation = useMutation({
    mutationFn: (mode: "MERGE" | "REPLACE") => {
      if (!backupFile) throw new Error("请选择 ZIP 备份。");
      const body = new FormData();
      body.append("file", backupFile);
      return api<ImportResult>(`/imports?mode=${mode}`, { method: "POST", body });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["prompts"] });
      await queryClient.invalidateQueries({ queryKey: ["knowledge"] });
    },
  });

  return <main className="settings-page">
    <header className="page-header"><div><h1>设置</h1><span className="count">本机凭据、翻译服务与数据管理</span></div></header>
    <section className="settings-section" aria-labelledby="translation-heading">
      <header><div className="section-icon"><KeyRound size={17} /></div><div><h2 id="translation-heading">翻译服务</h2><p>中文需求的英文 Prompt 由所选服务生成。</p></div>{statusQuery.data?.translation.configured ? <span className="configured-status"><CheckCircle2 size={14} />凭据已配置</span> : <span className="muted-status">未配置</span>}</header>
      <div className="settings-form">
        <label>翻译服务<select aria-label="翻译服务" value={provider} onChange={(event) => { setProvider(event.target.value as Provider); testMutation.reset(); }}><option value="openai">OpenAI</option><option value="microsoft">Microsoft Translator</option></select></label>
        <label>API Key<input aria-label="API Key" type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={statusQuery.data?.translation.configured ? "输入新密钥以替换现有凭据" : "输入 API Key"} /></label>
        {provider === "openai" ? <label>模型<input aria-label="模型名称" value={model} onChange={(event) => setModel(event.target.value)} /></label> : <><label>服务端点<input aria-label="服务端点" value={endpoint} onChange={(event) => setEndpoint(event.target.value)} /></label><label>区域<input aria-label="区域" value={region} onChange={(event) => setRegion(event.target.value)} placeholder="例如 eastasia" /></label></>}
        <div className="settings-actions"><button className="primary-button" disabled={!apiKey.trim() || saveMutation.isPending} onClick={() => saveMutation.mutate()}><Save size={15} />{saveMutation.isPending ? "保存中..." : "保存设置"}</button><button className="secondary-button" disabled={!statusQuery.data?.translation.configured || testMutation.isPending} onClick={() => testMutation.mutate()}><PlugZap size={15} />{testMutation.isPending ? "测试中..." : "测试连接"}</button></div>
        {testMutation.isSuccess ? <p className="success-message">连接测试成功</p> : null}
        {saveMutation.isError || testMutation.isError ? <p className="form-error">{(saveMutation.error ?? testMutation.error)?.message}</p> : null}
      </div>
    </section>
    <section className="settings-section" aria-labelledby="ai-heading">
      <header><div className="section-icon"><Bot size={17} /></div><div><h2 id="ai-heading">通用 AI Provider</h2><p>用于 Prompt 优化、变体、检查和模型重写。</p></div>{aiStatusQuery.data?.configured ? <span className="configured-status"><CheckCircle2 size={14} />凭据已配置</span> : <span className="muted-status">未配置</span>}</header>
      <div className="settings-form">
        <label>Base URL<input aria-label="AI Base URL" value={aiBaseUrl} onChange={(event) => setAiBaseUrl(event.target.value)} /></label>
        <label>模型<input aria-label="AI 模型" value={aiModel} onChange={(event) => setAiModel(event.target.value)} /></label>
        <label>Provider 密钥<input aria-label="AI Provider 密钥" type="password" autoComplete="off" value={aiApiKey} onChange={(event) => setAiApiKey(event.target.value)} placeholder={aiStatusQuery.data?.configured ? "输入新密钥以替换现有凭据" : "输入 Provider 密钥"} /></label>
        <div className="settings-actions"><button className="primary-button" disabled={!aiApiKey.trim() || saveAiMutation.isPending} onClick={() => saveAiMutation.mutate()}><Save size={15} />保存 Provider</button><button className="secondary-button" disabled={!aiStatusQuery.data?.configured || testAiMutation.isPending} onClick={() => testAiMutation.mutate()}><PlugZap size={15} />{testAiMutation.isPending ? "测试中..." : "测试 AI 连接"}</button></div>
        {testAiMutation.isSuccess ? <p className="success-message">AI Provider 连接成功</p> : null}
        {saveAiMutation.isError || testAiMutation.isError ? <p className="form-error">{(saveAiMutation.error ?? testAiMutation.error)?.message}</p> : null}
      </div>
    </section>
    <section className="settings-section" aria-labelledby="export-heading">
      <header><div className="section-icon"><DatabaseBackup size={17} /></div><div><h2 id="export-heading">数据备份</h2><p>导出 Prompt、知识库记录和本地资产。</p></div></header>
      <div className="export-panel"><button className="primary-button" disabled={exportMutation.isPending} onClick={() => exportMutation.mutate()}><DatabaseBackup size={15} />{exportMutation.isPending ? "正在生成..." : "生成数据备份"}</button>{exportMutation.data ? <a className="secondary-button download-link" href={exportMutation.data.downloadUrl} download={exportMutation.data.filename}><Download size={15} />下载备份</a> : null}{exportMutation.isError ? <p className="form-error">{exportMutation.error.message}</p> : null}</div>
      <div className="export-panel"><button className="secondary-button" disabled={integrityQuery.isFetching} onClick={() => void integrityQuery.refetch()}><RefreshCw size={15} />检查数据完整性</button>{integrityQuery.data ? <p className={integrityQuery.data.missingFiles.length || integrityQuery.data.orphanFiles.length ? "form-error" : "success-message"}><ShieldCheck size={14} />已检查 {integrityQuery.data.assetCount} 个素材，缺失 {integrityQuery.data.missingFiles.length}，孤立 {integrityQuery.data.orphanFiles.length}</p> : null}</div>
      <div className="settings-form">
        <label>恢复备份文件<input aria-label="选择备份 ZIP" type="file" accept=".zip,application/zip" onChange={(event) => { setBackupFile(event.target.files?.[0] ?? null); validateImportMutation.reset(); restoreImportMutation.reset(); }} /></label>
        <button className="secondary-button" disabled={!backupFile || validateImportMutation.isPending} onClick={() => validateImportMutation.mutate()}>{validateImportMutation.isPending ? "校验中..." : "校验备份"}</button>
        {validateImportMutation.data ? <div className="import-summary">
          <p className="success-message">备份有效：{validateImportMutation.data.promptCount} 条 Prompt，{validateImportMutation.data.assetCount} 个素材。</p>
          <p className={validateImportMutation.data.conflicts.length ? "form-error" : "success-message"}>发现 {validateImportMutation.data.conflicts.length} 条 ID 冲突，缺失 {validateImportMutation.data.missingAssets.length} 个素材。</p>
          <div className="settings-actions">
            <button className="primary-button" disabled={restoreImportMutation.isPending} onClick={() => restoreImportMutation.mutate("MERGE")}>合并恢复</button>
            <button className="danger-button" disabled={restoreImportMutation.isPending} onClick={() => { if (window.confirm("完整替换会先自动备份，再清空当前数据并恢复。确定继续吗？")) restoreImportMutation.mutate("REPLACE"); }}>完整替换</button>
          </div>
        </div> : null}
        {restoreImportMutation.data ? <p className="success-message">恢复完成：{restoreImportMutation.data.promptCount} 条 Prompt，{restoreImportMutation.data.restoredAssets} 个素材。</p> : null}
        {validateImportMutation.isError || restoreImportMutation.isError ? <p className="form-error">{(validateImportMutation.error ?? restoreImportMutation.error)?.message}</p> : null}
      </div>
    </section>
  </main>;
}
