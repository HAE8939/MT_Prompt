import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteVault } from "../vault/open-vault";
import { createSettingsRepository } from "../vault/settings-repository";
import { VaultProvider } from "../vault/VaultProvider";
import { InterfaceSettingsProvider, useInterfaceSettings } from "./InterfaceSettingsProvider";

afterEach(async () => { cleanup(); vi.unstubAllGlobals(); await deleteVault(); });

function Probe() {
  const { settings, updateSettings } = useInterfaceSettings();
  return <div>
    <span data-testid="theme">{settings.theme}</span>
    <span data-testid="density">{settings.compact ? "compact" : "comfortable"}</span>
    <button onClick={() => updateSettings({ ...settings, theme: "dark" })}>set-dark</button>
    <button onClick={() => updateSettings({ ...settings, compact: false })}>set-comfortable</button>
  </div>;
}

describe("InterfaceSettingsProvider", () => {
  it("applies dark theme to the document root", async () => {
    document.documentElement.dataset.theme = "";
    render(<VaultProvider><InterfaceSettingsProvider><Probe /></InterfaceSettingsProvider></VaultProvider>);
    await waitFor(() => expect(screen.getByTestId("theme")).toHaveTextContent("system"));
    await userEvent.click(screen.getByRole("button", { name: "set-dark" }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
  });

  it("applies compact density to the document root", async () => {
    document.documentElement.dataset.density = "";
    render(<VaultProvider><InterfaceSettingsProvider><Probe /></InterfaceSettingsProvider></VaultProvider>);
    await waitFor(() => expect(screen.getByTestId("density")).toHaveTextContent("compact"));
    await waitFor(() => expect(document.documentElement.dataset.density).toBe("compact"));
    await userEvent.click(screen.getByRole("button", { name: "set-comfortable" }));
    await waitFor(() => expect(document.documentElement.dataset.density).toBe("comfortable"));
  });

  it("persists interface settings and reloads them", async () => {
    render(<VaultProvider><InterfaceSettingsProvider><Probe /></InterfaceSettingsProvider></VaultProvider>);
    await waitFor(() => expect(screen.getByTestId("theme")).toHaveTextContent("system"));
    await userEvent.click(screen.getByRole("button", { name: "set-dark" }));
    await waitFor(async () => expect((await createSettingsRepository().getInterface()).theme).toBe("dark"));
  });
});
