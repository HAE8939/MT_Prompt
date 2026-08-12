import { Archive, BookOpen, Settings, Sparkles } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

const nav = [
  { to: "/library", label: "Prompt 库", icon: Archive },
  { to: "/generator", label: "Prompt 生成器", icon: Sparkles },
  { to: "/knowledge", label: "模板与技能", icon: BookOpen },
  { to: "/settings", label: "设置", icon: Settings },
];

export function AppShell() {
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><img src="/logo.svg" alt="" /></span><span>MT-Prompt</span></div>
      <nav className="main-nav" aria-label="主导航">
        {nav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}><Icon size={16} /><span>{label}</span></NavLink>)}
      </nav>
      <div className="sidebar-footer"><span className="status-dot" />浏览器 Vault</div>
    </aside>
    <div className="workspace"><Outlet /></div>
  </div>;
}
