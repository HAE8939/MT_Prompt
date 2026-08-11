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
      if (url.includes("/exports") && init?.method === "POST") return { ok: true, status: 201, json: async () => ({ filename: "promptvault-test.zip", downloadUrl: "/api/v1/exports/promptvault-test.zip" }) };
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
    await userEvent.click(screen.getByRole("button", { name: "生成数据备份" }));
    expect(await screen.findByRole("link", { name: "下载备份" })).toHaveAttribute("href", "/api/v1/exports/promptvault-test.zip");
  });

  it("validates and merges a selected backup with an import summary", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/settings/status")) return response({ translation: { provider: null, configured: false, model: null } });
      if (url.includes("/settings/ai-provider/status")) return response({ configured: false, baseUrl: null, model: null });
      if (url.includes("/imports/validate")) return response({ valid: true, schemaVersion: 1, promptCount: 2, assetCount: 1, missingAssets: [], conflicts: ["prompt-1"] });
      if (url.includes("/imports?mode=MERGE") && init?.method === "POST") return response({ mode: "MERGE", promptCount: 2, restoredAssets: 1, conflicts: ["prompt-1"], missingAssets: [] });
      throw new Error(`unexpected ${url}`);
    }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><SettingsPage /></QueryClientProvider>);
    const file = new File(["backup"], "promptvault.zip", { type: "application/zip" });

    await userEvent.upload(await screen.findByLabelText("选择备份 ZIP"), file);
    await userEvent.click(screen.getByRole("button", { name: "校验备份" }));
    expect(await screen.findByText(/发现 1 条 ID 冲突/)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "合并恢复" }));
    expect(await screen.findByText("恢复完成：2 条 Prompt，1 个素材。" )).toBeVisible();
  });
});

function response(value: unknown) {
  return { ok: true, status: 200, json: async () => value };
}
