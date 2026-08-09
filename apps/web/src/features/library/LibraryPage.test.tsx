import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LibraryPage } from "./LibraryPage";

const prompt = {
  id: "p1", title: "现代东方豪宅客厅", description: "蓝调夜景修改", contentZh: "保持空间结构不变。",
  contentEn: "Preserve the spatial structure.", status: "VERIFIED", rating: 5, origin: "MANUAL",
  model: { id: "m1", name: "GPT-IMAGE 2", provider: "OpenAI", mediaType: "IMAGE" },
  task: { id: "t1", key: "scene-edit", nameZh: "场景保持修改", nameEn: "Scene Edit" },
  category: null, tags: [{ id: "tag1", name: "室内设计", type: null }], assets: [],
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
};

describe("LibraryPage", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("loads Prompt cards and opens the docked detail panel", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [prompt], total: 1, page: 1, limit: 20 }) }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter><LibraryPage /></MemoryRouter></QueryClientProvider>);

    expect(await screen.findByText("现代东方豪宅客厅")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: /打开现代东方豪宅客厅/ }));
    expect(screen.getByRole("complementary", { name: "Prompt 详情" })).toHaveTextContent("保持空间结构不变");
  });

  it("creates a Prompt from the library", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/models")) return { ok: true, status: 200, json: async () => [{ id: "m1", name: "GPT-IMAGE 2", tasks: [{ id: "t1", nameZh: "场景保持修改" }] }] };
      if (init?.method === "POST") return { ok: true, status: 201, json: async () => ({ ...prompt, id: "created", title: "新建客厅 Prompt" }) };
      return { ok: true, status: 200, json: async () => ({ data: [], total: 0, page: 1, limit: 20 }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter><LibraryPage /></MemoryRouter></QueryClientProvider>);

    await userEvent.click(screen.getByRole("button", { name: "新建 Prompt" }));
    await userEvent.type(screen.getByLabelText("标题"), "新建客厅 Prompt");
    await userEvent.type(screen.getByLabelText("中文 Prompt"), "保持客厅结构不变");
    await userEvent.click(screen.getByRole("button", { name: "保存 Prompt" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/prompts", expect.objectContaining({ method: "POST" }));
  });
});
