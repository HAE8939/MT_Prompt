import { Navigate, Route, Routes } from "react-router-dom";
import { LibraryPage } from "../features/library/LibraryPage";
import { GeneratorPage } from "../features/generator/GeneratorPage";
import { KnowledgePage } from "../features/knowledge/KnowledgePage";
import { AppShell } from "./AppShell";

function ComingSoon({ title }: { title: string }) {
  return <section className="placeholder-page"><h1>{title}</h1><p>该工作区将在下一阶段接入。</p></section>;
}

export function AppRouter() {
  return <Routes>
    <Route element={<AppShell />}>
      <Route index element={<Navigate to="/library" replace />} />
      <Route path="/library" element={<LibraryPage />} />
      <Route path="/generator" element={<GeneratorPage />} />
      <Route path="/knowledge" element={<KnowledgePage />} />
      <Route path="/settings" element={<ComingSoon title="设置" />} />
    </Route>
  </Routes>;
}
