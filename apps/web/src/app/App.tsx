import { AppRouter } from "./router";
import { VaultProvider } from "../vault/VaultProvider";
import { InterfaceSettingsProvider } from "../settings/InterfaceSettingsProvider";

export function App() {
  return (
    <VaultProvider>
      <InterfaceSettingsProvider>
        <AppRouter />
      </InterfaceSettingsProvider>
    </VaultProvider>
  );
}
