import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GeneratorPage } from "./GeneratorPage";

describe("GeneratorPage", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("generates a bilingual Prompt from a selected task", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/models")) return { ok: true, status: 200, json: async () => [{ id: "m1", stableKey: "gpt-image-2", name: "GPT-IMAGE 2", tasks: [{ id: "t1", nameZh: "场景保持修改", templates: [{ id: "tpl1", nameZh: "场景保持模板" }] }] }] };
      if (url.includes("/skills")) return { ok: true, status: 200, json: async () => ({ data: [] }) };
      if (init?.method === "POST") return { ok: true, status: 201, json: async () => ({ id: "run1", contentZh: "保持空间结构，将白天改成蓝调夜景。", contentEn: "Preserve the spatial structure and change daylight to blue hour.", translationStatus: "SUCCEEDED" }) };
      throw new Error(`unexpected ${url}`);
    }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><GeneratorPage /></QueryClientProvider>);

    await screen.findByLabelText("模型");
    await userEvent.type(screen.getByLabelText("任务要求"), "将白天改成蓝调夜景");
    await userEvent.click(screen.getByRole("button", { name: "生成 Prompt" }));

    expect(await screen.findByText("保持空间结构，将白天改成蓝调夜景。")).toBeVisible();
    expect(screen.getByText("Preserve the spatial structure and change daylight to blue hour.")).toBeVisible();
  });
});
