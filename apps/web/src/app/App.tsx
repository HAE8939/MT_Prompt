import { AppRouter } from "./router";
import { VaultProvider } from "../vault/VaultProvider";

export function App() { return <VaultProvider><AppRouter /></VaultProvider>; }
