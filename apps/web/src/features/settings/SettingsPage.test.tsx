import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteVault } from "../../vault/open-vault";
import { createSettingsRepository } from "../../vault/settings-repository";
import { VaultProvider } from "../../vault/VaultProvider";
import { SettingsPage } from "./SettingsPage";

afterEach(async () => { cleanup(); vi.unstubAllGlobals(); await deleteVault(); });

describe("SettingsPage", () => {
  it("saves and clears device-local Provider settings", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("not requested"))));
    render(<VaultProvider><SettingsPage /></VaultProvider>);
    await userEvent.type(await screen.findByLabelText("Provider 地址"), "https://provider.example/v1");
    await userEvent.type(screen.getByLabelText("模型"), "model-a");
    await userEvent.type(screen.getByLabelText("Provider 密钥"), "secret");
    await userEvent.click(screen.getByRole("button", { name: "保存 Provider" }));
    await waitFor(async () => expect(await createSettingsRepository().getProvider()).toEqual({ baseUrl: "https://provider.example/v1", model: "model-a", apiKey: "secret" }));
    expect(screen.getByLabelText("Provider 密钥")).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: "清除 Provider" }));
    await waitFor(async () => expect(await createSettingsRepository().getProvider()).toBeUndefined());
    expect(fetch).not.toHaveBeenCalled();
  });
});
