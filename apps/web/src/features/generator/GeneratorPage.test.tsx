import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPromptRepository } from "../../vault/prompt-repository";
import { createSettingsRepository } from "../../vault/settings-repository";
import { deleteVault } from "../../vault/open-vault";
import { VaultProvider } from "../../vault/VaultProvider";
import { GeneratorPage } from "./GeneratorPage";
import { BUILT_IN_MODELS, BUILT_IN_TASKS } from "../../vault/built-in-catalog";

describe("GeneratorPage", () => {
  afterEach(async () => {
    cleanup();
    vi.unstubAllGlobals();
    await deleteVault();
  });

  it("compiles and saves a bilingual Prompt entirely in the browser", async () => {
    const fetch = vi.fn(() => Promise.reject(new Error("network must not be used")));
    vi.stubGlobal("fetch", fetch);
    render(<VaultProvider><GeneratorPage /></VaultProvider>);

    await screen.findByLabelText("模板");
    await userEvent.type(screen.getByLabelText("任务要求"), "将白天改成蓝调夜景");
    await userEvent.click(screen.getByLabelText("参考图锁定"));
    await userEvent.click(screen.getByRole("button", { name: "生成 Prompt" }));

    expect(await screen.findByText(/任务要求：[\s\S]*将白天改成蓝调夜景/)).toBeVisible();
    expect(screen.getByText(/Task requirements:/)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "保存到 Prompt 库" }));

    expect(await screen.findByText("已保存到 Prompt 库")).toBeVisible();
    await waitFor(async () => {
      const saved = await createPromptRepository().list({
        sort: "createdAt",
        order: "desc",
      });
      expect(saved.some(({ title, origin }) =>
        title === "将白天改成蓝调夜景" && origin === "GENERATED"
      )).toBe(true);
    });
    expect(fetch).not.toHaveBeenCalledWith(expect.stringMatching(/^https?:\/\//));
  });

  it("cascades model to task selection and filters incompatible Skills", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network must not be used"))));
    render(<VaultProvider><GeneratorPage /></VaultProvider>);

    const modelSelect = await screen.findByLabelText("模型");
    expect(modelSelect.querySelectorAll("option")).toHaveLength(BUILT_IN_MODELS.length);
    expect(modelSelect).toHaveValue("gpt-image-2");

    const taskSelect = screen.getByLabelText("任务");
    const gptTasks = BUILT_IN_TASKS.filter((task) => task.modelKey === "gpt-image-2");
    expect(taskSelect.querySelectorAll("option")).toHaveLength(gptTasks.length);
    expect(screen.getByLabelText("参考图锁定")).toBeInTheDocument();

    await userEvent.selectOptions(modelSelect, "kling-3");
    const klingTasks = BUILT_IN_TASKS.filter((task) => task.modelKey === "kling-3");
    expect(screen.getByLabelText("任务").querySelectorAll("option")).toHaveLength(klingTasks.length);
    expect(screen.queryByLabelText("参考图锁定")).toBeNull();
  });

  it("keeps the local result when Provider enhancement fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/api/provider")) {
        return new Response("server error", { status: 500 });
      }
      return Promise.reject(new Error("network must not be used"));
    }));
    const repository = createSettingsRepository();
    await repository.saveProvider({ baseUrl: "https://proxy.local", model: "enhance", apiKey: "secret" });
    render(<VaultProvider><GeneratorPage /></VaultProvider>);

    await screen.findByLabelText("任务要求");
    await userEvent.type(screen.getByLabelText("任务要求"), "提升画面质感");
    await userEvent.click(screen.getByRole("button", { name: "生成 Prompt" }));
    expect(await screen.findByText(/任务要求：[\s\S]*提升画面质感/)).toBeVisible();

    const enhance = await screen.findByRole("button", { name: /增强/ });
    await userEvent.click(enhance);

    expect(screen.getByText(/任务要求：[\s\S]*提升画面质感/)).toBeVisible();
    expect(await screen.findByRole("alert")).toBeVisible();
  });

  it("preserves distinct bilingual output during Provider enhancement", async () => {
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/api/provider")) {
        const payload = JSON.parse(init!.body as string) as { messages: Array<{ content: string }> };
        const requestContent = payload.messages[0]!.content;
        expect(requestContent).toContain("将白天改成蓝调夜景");
        expect(requestContent).toContain("Original Chinese requirement: 将白天改成蓝调夜景");
        return new Response(
          JSON.stringify({ choices: [{ message: { content: JSON.stringify({ contentZh: "优化后的中文 Prompt", contentEn: "Enhanced English Prompt" }) } }] }),
          { status: 200 },
        );
      }
      return Promise.reject(new Error("network must not be used"));
    });
    vi.stubGlobal("fetch", fetch);
    const repository = createSettingsRepository();
    await repository.saveProvider({ baseUrl: "https://proxy.local", model: "enhance", apiKey: "secret" });
    render(<VaultProvider><GeneratorPage /></VaultProvider>);

    await screen.findByLabelText("任务要求");
    await userEvent.type(screen.getByLabelText("任务要求"), "将白天改成蓝调夜景");
    await userEvent.click(screen.getByRole("button", { name: "生成 Prompt" }));
    expect(await screen.findByText(/任务要求：[\s\S]*将白天改成蓝调夜景/)).toBeVisible();

    const enhanceButton = await screen.findByRole("button", { name: /增强/ });
    await userEvent.click(enhanceButton);

    expect(await screen.findByText("优化后的中文 Prompt")).toBeVisible();
    expect(await screen.findByText("Enhanced English Prompt")).toBeVisible();
    expect(screen.getByText("优化后的中文 Prompt")).not.toBe(screen.getByText("Enhanced English Prompt"));
  });
});
