import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, KeyRound, PlugZap, Save } from "lucide-react";
import { useState } from "react";
import { api } from "../../lib/api-client";
import "./settings.css";

type Provider = "openai" | "microsoft";
type SettingsStatus = { translation: { provider: Provider | null; configured: boolean; model: string | null; endpoint?: string | null; region?: string | null } };

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState<Provider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-5-mini");
  const [endpoint, setEndpoint] = useState("https://api.cognitive.microsofttranslator.com");
  const [region, setRegion] = useState("");
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
  </main>;
}
