import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KnowledgePage } from "./KnowledgePage";

describe("KnowledgePage", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("shows the registered model task templates and skills", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/models")) return { ok: true, json: async () => [{ id: "m1", name: "GPT-IMAGE 2", tasks: [{ id: "t1", nameZh: "场景保持修改", templates: [{ id: "tpl1", nameZh: "场景保持模板" }] }] }] };
      return { ok: true, json: async () => ({ data: [{ id: "s1", nameZh: "室内摄影", category: "PHOTOGRAPHY" }] }) };
    }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><KnowledgePage /></QueryClientProvider>);

    expect(await screen.findByText("场景保持模板")).toBeVisible();
    expect(screen.getByText("室内摄影")).toBeVisible();
  });
});
