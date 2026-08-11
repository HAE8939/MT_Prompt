import { Navigate, Route, Routes } from "react-router-dom";
import { LibraryPage } from "../features/library/LibraryPage";
import { GeneratorPage } from "../features/generator/GeneratorPage";
import { KnowledgePage } from "../features/knowledge/KnowledgePage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { AppShell } from "./AppShell";

export function AppRouter() {
  return <Routes>
    <Route element={<AppShell />}>
      <Route index element={<Navigate to="/library" replace />} />
      <Route path="/library" element={<LibraryPage />} />
      <Route path="/generator" element={<GeneratorPage />} />
      <Route path="/knowledge" element={<KnowledgePage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Route>
  </Routes>;
}
