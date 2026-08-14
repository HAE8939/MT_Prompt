import { KeyRound, Palette, Save, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { InterfaceSettings, ProviderSettings } from "../../domain/types";
import { testProvider } from "../../lib/provider-client";
import { useVault } from "../../vault/VaultProvider";
import { useInterfaceSettings } from "../../settings/InterfaceSettingsProvider";
import "./settings.css";

const defaultProvider: ProviderSettings = { baseUrl: "", model: "", apiKey: "" };
type PanelKey = "PROVIDER" | "INTERFACE" | "BOUNDARY";
const NAV_ITEMS: { key: PanelKey; label: string; icon: typeof KeyRound }[] = [
  { key: "PROVIDER", label: "Provider", icon: KeyRound },
  { key: "INTERFACE", label: "界面", icon: Palette },
  { key: "BOUNDARY", label: "数据边界", icon: ShieldCheck },
];

function ProviderPanel() {
  const { settings: repository } = useVault();
  const [provider, setProvider] = useState(defaultProvider);
  const [configured, setConfigured] = useState(false);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void repository.getProvider().then((savedProvider) => {
      if (savedProvider) { setProvider(savedProvider); setConfigured(true); }
    });
  }, [repository]);

  async function saveProvider() {
    setPending(true);
    await repository.saveProvider(provider);
    setConfigured(true);
    setStatus("Provider 已保存到当前浏览器。");
    setPending(false);
  }
  async function clearProvider() {
    await repository.clearProvider();
    setProvider(defaultProvider);
    setConfigured(false);
    setStatus("Provider 已清除。");
  }
  async function test() {
    setPending(true);
    setStatus("");
    try { await testProvider(provider); setStatus("连接测试成功"); }
    catch (error) { setStatus(error instanceof Error ? error.message : "连接失败"); }
    finally { setPending(false); }
  }

  return <section className="settings-panel-block" aria-label="通用 Provider"><header><div className="section-icon"><KeyRound size={17} /></div><div><h2>通用 Provider</h2><p>仅在你主动测试或调用增强功能时，经同源代理发送。</p></div><span className={configured ? "configured-status" : "muted-status"}>{configured ? "已配置" : "未配置"}</span></header><div className="settings-form">
    <label>Provider 地址<input aria-label="Provider 地址" value={provider.baseUrl} onChange={(event) => setProvider({ ...provider, baseUrl: event.target.value })} placeholder="https://provider.example/v1" /></label>
    <label>模型<input aria-label="模型" value={provider.model} onChange={(event) => setProvider({ ...provider, model: event.target.value })} /></label>
    <label>Provider 密钥<input aria-label="Provider 密钥" type="password" autoComplete="off" value={provider.apiKey} onChange={(event) => setProvider({ ...provider, apiKey: event.target.value })} /></label>
    <div className="settings-actions"><button className="primary-button" disabled={pending || !provider.baseUrl || !provider.model || !provider.apiKey} onClick={() => void saveProvider()}><Save size={15} />保存 Provider</button><button className="secondary-button" disabled={pending || !configured} onClick={() => void test()}>测试连接</button><button className="danger-button" disabled={pending || !configured} onClick={() => void clearProvider()}><Trash2 size={14} />清除 Provider</button></div>{status ? <p className="success-message" role="status">{status}</p> : null}
  </div></section>;
}

function InterfacePanel() {
  const { settings: ui, updateSettings } = useInterfaceSettings();
  function setInterface(patch: Partial<InterfaceSettings>) { void updateSettings({ ...ui, ...patch }); }
  return <section className="settings-panel-block" aria-label="界面"><header><div className="section-icon"><Palette size={17} /></div><div><h2>界面</h2><p>这些设置可选择随 .prompt 分享，Provider 永远不会包含。</p></div></header><div className="settings-form">
    <label>主题<select aria-label="主题" value={ui.theme} onChange={(event) => setInterface({ theme: event.target.value as InterfaceSettings["theme"] })}><option value="system">跟随系统</option><option value="light">浅色</option><option value="dark">深色</option></select></label>
    <label>Prompt 库默认视图<select aria-label="Prompt 库默认视图" value={ui.libraryView} onChange={(event) => setInterface({ libraryView: event.target.value as InterfaceSettings["libraryView"] })}><option value="list">列表</option><option value="grid">网格</option></select></label>
    <label className="enabled-toggle"><input type="checkbox" aria-label="紧凑模式" checked={ui.compact} onChange={(event) => setInterface({ compact: event.target.checked })} />紧凑模式</label>
  </div></section>;
}

function BoundaryPanel() {
  return <section className="settings-panel-block" aria-label="数据边界"><header><div className="section-icon"><ShieldCheck size={17} /></div><div><h2>数据边界</h2><p>本地优先，迁移由你主导。</p></div></header><div className="boundary-body">
    <p>所有 Prompt、素材、模板与界面设置<strong>仅保存在当前浏览器</strong>的 IndexedDB，不会上传到任何服务器。</p>
    <p>Docker 镜像只提供静态前端与无状态代理，不存储用户数据。要迁移到其他设备，请在 <strong>Prompt 库</strong> 使用导出 / 导入（.prompt 文件包含 Prompt 与素材元数据，界面偏好需单独勾选分享）。</p>
    <p className="muted-note">Provider 密钥属于设备本地配置，绝不随 .prompt 文件导出。</p>
  </div></section>;
}

export function SettingsPage() {
  const [panel, setPanel] = useState<PanelKey>("PROVIDER");
  return <main className="settings-page"><header className="page-header"><div><h1>设置</h1><span className="count">当前浏览器的 Provider 与界面偏好</span></div></header>
    <div className="settings-workbench">
      <nav className="settings-nav" aria-label="设置分区">{NAV_ITEMS.map(({ key, label, icon: Icon }) => <button key={key} className={panel === key ? "active" : ""} onClick={() => setPanel(key)}><Icon size={15} />{label}</button>)}</nav>
      <div className="settings-panel-view">{panel === "PROVIDER" && <ProviderPanel />}{panel === "INTERFACE" && <InterfacePanel />}{panel === "BOUNDARY" && <BoundaryPanel />}</div>
    </div>
  </main>;
}
