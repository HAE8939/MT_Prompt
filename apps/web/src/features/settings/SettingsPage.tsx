import { KeyRound, Palette, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { InterfaceSettings, ProviderSettings } from "../../domain/types";
import { testProvider } from "../../lib/provider-client";
import { useVault } from "../../vault/VaultProvider";
import "./settings.css";

const defaultProvider: ProviderSettings = { baseUrl: "", model: "", apiKey: "" };
export function SettingsPage() {
  const { settings } = useVault(); const [provider, setProvider] = useState(defaultProvider); const [configured, setConfigured] = useState(false);
  const [ui, setUi] = useState<InterfaceSettings>({ theme: "system", language: "zh-CN", libraryView: "list", compact: true });
  const [status, setStatus] = useState(""); const [pending, setPending] = useState(false);
  useEffect(() => { void Promise.all([settings.getProvider(), settings.getInterface()]).then(([savedProvider, savedUi]) => { if (savedProvider) { setProvider(savedProvider); setConfigured(true); } setUi(savedUi); }); }, [settings]);
  async function saveProvider() { setPending(true); await settings.saveProvider(provider); setConfigured(true); setStatus("Provider 已保存到当前浏览器。"); setPending(false); }
  async function clearProvider() { await settings.clearProvider(); setProvider(defaultProvider); setConfigured(false); setStatus("Provider 已清除。"); }
  async function test() { setPending(true); setStatus(""); try { await testProvider(provider); setStatus("连接测试成功"); } catch (error) { setStatus(error instanceof Error ? error.message : "连接失败"); } finally { setPending(false); } }
  async function saveInterface(next: InterfaceSettings) { setUi(next); await settings.saveInterface(next); }
  return <main className="settings-page"><header className="page-header"><div><h1>设置</h1><span className="count">当前浏览器的 Provider 与界面偏好</span></div></header>
    <section className="settings-section"><header><div className="section-icon"><KeyRound size={17} /></div><div><h2>通用 Provider</h2><p>仅在你主动测试或调用增强功能时，经同源代理发送。</p></div><span className={configured ? "configured-status" : "muted-status"}>{configured ? "已配置" : "未配置"}</span></header><div className="settings-form">
      <label>Provider 地址<input aria-label="Provider 地址" value={provider.baseUrl} onChange={(event) => setProvider({ ...provider, baseUrl: event.target.value })} placeholder="https://provider.example/v1" /></label>
      <label>模型<input aria-label="模型" value={provider.model} onChange={(event) => setProvider({ ...provider, model: event.target.value })} /></label>
      <label>Provider 密钥<input aria-label="Provider 密钥" type="password" autoComplete="off" value={provider.apiKey} onChange={(event) => setProvider({ ...provider, apiKey: event.target.value })} /></label>
      <div className="settings-actions"><button className="primary-button" disabled={pending || !provider.baseUrl || !provider.model || !provider.apiKey} onClick={() => void saveProvider()}><Save size={15} />保存 Provider</button><button className="secondary-button" disabled={pending || !configured} onClick={() => void test()}>测试连接</button><button className="danger-button" disabled={pending || !configured} onClick={() => void clearProvider()}><Trash2 size={14} />清除 Provider</button></div>{status ? <p className="success-message" role="status">{status}</p> : null}
    </div></section>
    <section className="settings-section"><header><div className="section-icon"><Palette size={17} /></div><div><h2>界面</h2><p>这些设置可选择随 .prompt 分享，Provider 永远不会包含。</p></div></header><div className="settings-form">
      <label>主题<select value={ui.theme} onChange={(event) => void saveInterface({ ...ui, theme: event.target.value as InterfaceSettings["theme"] })}><option value="system">跟随系统</option><option value="light">浅色</option><option value="dark">深色</option></select></label>
      <label>Prompt 库默认视图<select value={ui.libraryView} onChange={(event) => void saveInterface({ ...ui, libraryView: event.target.value as InterfaceSettings["libraryView"] })}><option value="list">列表</option><option value="grid">网格</option></select></label>
      <label className="enabled-toggle"><input type="checkbox" checked={ui.compact} onChange={(event) => void saveInterface({ ...ui, compact: event.target.checked })} />紧凑模式</label>
    </div></section>
    <section className="settings-section"><header><div className="section-icon"><Save size={17} /></div><div><h2>数据</h2><p>Prompt、素材、模板与设置保存在当前浏览器。导入导出请在 Prompt 库操作。</p></div></header></section>
  </main>;
}
