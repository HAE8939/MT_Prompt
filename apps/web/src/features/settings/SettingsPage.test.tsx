import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsPage } from "./SettingsPage";

describe("SettingsPage", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("configures and tests an OpenAI translation provider", async () => {
    let configured = false;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/settings/status")) return { ok: true, status: 200, json: async () => ({ translation: { provider: configured ? "openai" : null, configured, model: configured ? "gpt-5-mini" : null } }) };
      if (url.includes("/settings/translation-provider/test")) return { ok: true, status: 204, json: async () => null };
      if (url.includes("/settings/translation-provider") && init?.method === "PUT") { configured = true; return { ok: true, status: 204, json: async () => null }; }
      throw new Error(`unexpected ${url}`);
    }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><SettingsPage /></QueryClientProvider>);

    await screen.findByRole("combobox", { name: "翻译服务" });
    await userEvent.type(screen.getByLabelText("API Key"), "test-secret");
    await userEvent.click(screen.getByRole("button", { name: "保存设置" }));
    expect(await screen.findByText("凭据已配置")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "测试连接" }));
    expect(await screen.findByText("连接测试成功")).toBeVisible();
  });
});
