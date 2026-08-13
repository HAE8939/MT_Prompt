import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import type { InterfaceSettings } from "../domain/types";
import { useVault } from "../vault/VaultProvider";
import "./interface-theme.css";

export const DEFAULT_INTERFACE: InterfaceSettings = {
  theme: "system",
  language: "zh-CN",
  libraryView: "list",
  compact: true,
};

export interface InterfaceSettingsContextValue {
  settings: InterfaceSettings;
  updateSettings: (next: InterfaceSettings) => void;
  ready: boolean;
  error?: Error;
}

const InterfaceSettingsContext = createContext<InterfaceSettingsContextValue | undefined>(undefined);

function resolveTheme(theme: InterfaceSettings["theme"]): "light" | "dark" {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

function applyToDocument(settings: InterfaceSettings): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = resolveTheme(settings.theme);
  root.dataset.density = settings.compact ? "compact" : "comfortable";
}

export function InterfaceSettingsProvider({ children }: PropsWithChildren) {
  const { settings: repository } = useVault();
  const [settings, setSettings] = useState<InterfaceSettings>(DEFAULT_INTERFACE);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error>();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    let active = true;
    repository.getInterface()
      .then((saved) => {
        if (!active) return;
        setSettings(saved);
        applyToDocument(saved);
        setReady(true);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError : new Error(String(loadError)));
      });
    return () => { active = false; };
  }, [repository]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (settingsRef.current.theme === "system") applyToDocument(settingsRef.current);
    };
    if (typeof query.addEventListener === "function") query.addEventListener("change", handler);
    else query.addListener(handler);
    return () => {
      if (typeof query.removeEventListener === "function") query.removeEventListener("change", handler);
      else query.removeListener(handler);
    };
  }, []);

  function updateSettings(next: InterfaceSettings) {
    setSettings(next);
    applyToDocument(next);
    repository.saveInterface(next).catch((saveError) => {
      setError(saveError instanceof Error ? saveError : new Error(String(saveError)));
    });
  }

  return (
    <InterfaceSettingsContext.Provider value={{ settings, updateSettings, ready, error }}>
      {children}
    </InterfaceSettingsContext.Provider>
  );
}

export function useInterfaceSettings(): InterfaceSettingsContextValue {
  const value = useContext(InterfaceSettingsContext);
  if (!value) throw new Error("useInterfaceSettings must be used within InterfaceSettingsProvider.");
  return value;
}
