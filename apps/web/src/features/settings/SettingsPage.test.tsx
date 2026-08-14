import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteVault } from "../../vault/open-vault";
import { createSettingsRepository } from "../../vault/settings-repository";
import { VaultProvider } from "../../vault/VaultProvider";
import { InterfaceSettingsProvider } from "../../settings/InterfaceSettingsProvider";
import { SettingsPage } from "./SettingsPage";

const { rejectSaveRef } = vi.hoisted(() => ({ rejectSaveRef: { value: false } }));

vi.mock("../../vault/settings-repository", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("../../vault/settings-repository");
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

describe("SettingsPage", () => {
  it("saves and clears device-local Provider settings", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("not requested"))));
    render(<VaultProvider><InterfaceSettingsProvider><SettingsPage /></InterfaceSettingsProvider></VaultProvider>);
    await userEvent.type(await screen.findByLabelText("Provider 地址"), "https://provider.example/v1");
    await userEvent.type(screen.getByLabelText("模型"), "model-a");
    await userEvent.type(screen.getByLabelText("Provider 密钥"), "secret");
    await userEvent.click(screen.getByRole("button", { name: "保存 Provider" }));
    await waitFor(async () => expect(await createSettingsRepository().getProvider()).toEqual({ baseUrl: "https://provider.example/v1", model: "model-a", apiKey: "secret" }));
    expect(screen.getByLabelText("Provider 密钥")).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: "清除 Provider" }));
    await waitFor(async () => expect(await createSettingsRepository().getProvider()).toBeUndefined());
    expect(fetch).not.toHaveBeenCalledWith(expect.stringMatching(/^https?:\/\//));
  });

  it("applies the selected theme to the document root through the interface provider", async () => {
    document.documentElement.dataset.theme = "";
    render(<VaultProvider><InterfaceSettingsProvider><SettingsPage /></InterfaceSettingsProvider></VaultProvider>);
    await userEvent.click(await screen.findByRole("button", { name: "界面" }));
    const themeSelect = await screen.findByLabelText("主题");
    await userEvent.selectOptions(themeSelect, "dark");
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    await userEvent.selectOptions(themeSelect, "light");
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("light"));
  });

  it("switches the active settings panel through the navigation", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("not requested"))));
    render(<VaultProvider><InterfaceSettingsProvider><SettingsPage /></InterfaceSettingsProvider></VaultProvider>);
    // The default panel is Provider.
    expect(await screen.findByLabelText("Provider 地址")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "数据边界" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "数据边界" })).toBeVisible());
    expect(screen.queryByLabelText("Provider 地址")).not.toBeInTheDocument();
  });

  it("shows a recoverable alert when interface persistence fails", async () => {
    rejectSaveRef.value = false;
    await createSettingsRepository().saveInterface({ theme: "dark", language: "zh-CN", libraryView: "list", compact: true });
    rejectSaveRef.value = true;
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("not requested"))));
    render(<VaultProvider><InterfaceSettingsProvider><SettingsPage /></InterfaceSettingsProvider></VaultProvider>);

    await userEvent.click(await screen.findByRole("button", { name: "界面" }));
    const themeSelect = await screen.findByLabelText("主题");
    await userEvent.selectOptions(themeSelect, "light");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/界面设置保存失败/);
    expect(themeSelect).toBeEnabled();
  });
});
