import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("edits a built-in Skill as a user copy and creates a personal rule", async () => {
    let skills = [{ id: "s1", nameZh: "室内摄影", nameEn: "Interior photography", contentZh: "真实室内摄影", contentEn: "Realistic interior photography", category: "PHOTOGRAPHY", priority: 100, conflictGroup: null, enabled: true, owner: "BUILT_IN", version: 1, modelTaskIds: ["t1"] }];
    let rules: Array<Record<string, unknown>> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/models")) return { ok: true, status: 200, json: async () => [{ id: "m1", name: "GPT-IMAGE 2", tasks: [{ id: "t1", nameZh: "场景保持修改", templates: [{ id: "tpl1", modelTaskId: "t1", nameZh: "场景保持模板", nameEn: "Scene template", templateZh: "{{requirements}}", templateEn: "{{requirements}}", fieldSchema: { fields: [] }, enabled: true, owner: "BUILT_IN", version: 1 }] }] }] };
      if (url.includes("/skills") && init?.method === "PATCH") { skills = [{ ...skills[0]!, id: "s2", contentZh: "真实室内摄影，保持材质", owner: "USER" }]; return { ok: true, status: 200, json: async () => skills[0] }; }
      if (url.includes("/skills")) return { ok: true, status: 200, json: async () => ({ data: skills }) };
      if (url.includes("/personal-rules") && init?.method === "POST") { rules = [{ id: "r1", nameZh: "默认构图", nameEn: "Default composition", contentZh: "保持构图", contentEn: "Preserve composition", priority: 900, enabled: true, owner: "USER", version: 1 }]; return { ok: true, status: 201, json: async () => rules[0] }; }
      if (url.includes("/personal-rules")) return { ok: true, status: 200, json: async () => rules };
      throw new Error(`unexpected ${url}`);
    }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><KnowledgePage /></QueryClientProvider>);

    await userEvent.click(await screen.findByRole("button", { name: "编辑 室内摄影" }));
    await userEvent.clear(screen.getByLabelText("中文内容"));
    await userEvent.type(screen.getByLabelText("中文内容"), "真实室内摄影，保持材质");
    await userEvent.click(screen.getByRole("button", { name: "保存知识" }));
    expect(await screen.findByText("用户副本")).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "新建个人规则" }));
    await userEvent.type(screen.getByLabelText("中文名称"), "默认构图");
    await userEvent.type(screen.getByLabelText("英文名称"), "Default composition");
    await userEvent.type(screen.getByLabelText("中文内容"), "保持构图");
    await userEvent.type(screen.getByLabelText("英文内容"), "Preserve composition");
    await userEvent.click(screen.getByRole("button", { name: "保存知识" }));
    expect(await screen.findByText("默认构图")).toBeVisible();
  });
});
