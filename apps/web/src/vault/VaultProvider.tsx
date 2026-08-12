import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { createKnowledgeRepository } from "./knowledge-repository";
import { initializeVault } from "./initialize-vault";
import { createPromptRepository } from "./prompt-repository";
import type { KnowledgeRepository, PromptRepository, SettingsRepository } from "./repository-types";
import { createSettingsRepository } from "./settings-repository";
import { createVaultTransaction } from "./vault-transaction";

interface VaultContextValue {
  prompts: PromptRepository;
  knowledge: KnowledgeRepository;
  settings: SettingsRepository;
  transaction: ReturnType<typeof createVaultTransaction>;
}

const repositories: VaultContextValue = {
  prompts: createPromptRepository(),
  knowledge: createKnowledgeRepository(),
  settings: createSettingsRepository(),
  transaction: createVaultTransaction(),
};

const VaultContext = createContext<VaultContextValue | undefined>(undefined);

export function VaultProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => { let active = true; initializeVault().then(() => { if (active) setStatus("ready"); }).catch(() => { if (active) setStatus("error"); }); return () => { active = false; }; }, []);
  if (status === "loading") return <main role="status">正在打开本地提示词库...</main>;
  if (status === "error") return <main role="alert"><h1>无法打开本地提示词库</h1><p>请确认浏览器允许使用 IndexedDB，然后刷新页面。</p></main>;
  return <VaultContext.Provider value={repositories}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const value = useContext(VaultContext);
  if (!value) throw new Error("useVault must be used within VaultProvider.");
  return value;
}
