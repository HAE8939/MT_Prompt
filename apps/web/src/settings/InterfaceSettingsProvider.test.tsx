import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteVault } from "../vault/open-vault";
import { createSettingsRepository } from "../vault/settings-repository";
import { VaultProvider } from "../vault/VaultProvider";
import { InterfaceSettingsProvider, useInterfaceSettings } from "./InterfaceSettingsProvider";

const { rejectSaveRef } = vi.hoisted(() => ({ rejectSaveRef: { value: false } }));

vi.mock("../vault/settings-repository", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("../vault/settings-repository");
  return {
    ...actual,
    createSettingsRepository: () => {
      const real = actual.createSettingsRepository();
      return {
        ...real,
        saveInterface: vi.fn(async (settings) => {
          if (rejectSaveRef.value) {
            await new Promise((resolve) => setTimeout(resolve, 30));
            throw new Error("simulated interface save failure");
          }
          return real.saveInterface(settings);
        }),
      };
    },
  };
});

afterEach(async () => { cleanup(); vi.unstubAllGlobals(); rejectSaveRef.value = false; await deleteVault(); });

function Probe() {
  const { settings, updateSettings, error } = useInterfaceSettings();
  return <div>
    <span data-testid="theme">{settings.theme}</span>
    <span data-testid="density">{settings.compact ? "compact" : "comfortable"}</span>
    <button onClick={() => updateSettings({ ...settings, theme: "dark" })}>set-dark</button>
    <button onClick={() => updateSettings({ ...settings, theme: "light" })}>set-light</button>
    <button onClick={() => updateSettings({ ...settings, compact: false })}>set-comfortable</button>
    {error ? <p className="form-error" role="alert">界面设置保存失败，请重试。</p> : null}
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

  it("rolls back the interface setting and shows an alert when persistence fails", async () => {
    rejectSaveRef.value = false;
    await createSettingsRepository().saveInterface({ theme: "dark", language: "zh-CN", libraryView: "list", compact: true });
    rejectSaveRef.value = true;
    document.documentElement.dataset.theme = "";
    render(<VaultProvider><InterfaceSettingsProvider><Probe /></InterfaceSettingsProvider></VaultProvider>);

    await waitFor(() => expect(screen.getByTestId("theme")).toHaveTextContent("dark"));
    expect(document.documentElement.dataset.theme).toBe("dark");

    await userEvent.click(screen.getByRole("button", { name: "set-light" }));
    // Optimistic update applies light first.
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("light"));
    // After the rejected save, both the document and the UI roll back to dark.
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/界面设置保存失败/);
  });
});
