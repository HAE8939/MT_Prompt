import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPromptRepository } from "../../vault/prompt-repository";
import { createSettingsRepository } from "../../vault/settings-repository";
import { createKnowledgeRepository } from "../../vault/knowledge-repository";
import { deleteVault } from "../../vault/open-vault";
import { VaultProvider } from "../../vault/VaultProvider";
import { GeneratorPage } from "./GeneratorPage";
import { BUILT_IN_MODELS, BUILT_IN_TASKS } from "../../vault/built-in-catalog";
import type { KnowledgeRecord } from "../../domain/types";

function dualFieldTemplate(): KnowledgeRecord {
  return {
    id: "test-template-dual-field",
    stableKey: "test-template-dual-field",
    kind: "TEMPLATE",
    owner: "USER",
    nameZh: "双字段测试模板",
    nameEn: "Dual-field test template",
    contentZh: "任务要求：\n{{requirements}}\n镜头运动：\n{{cameraMotion}}\n请严格遵循约束。",
    contentEn: "Task requirements:\n{{requirements}}\nCamera motion:\n{{cameraMotion}}\nFollow constraints.",
    enabled: true,
    version: 1,
    priority: 100,
    category: "TEMPLATE",
    updatedAt: "2026-08-13T00:00:00.000Z",
    taskKey: "gpt-image-2-image-generate",
    fieldSchema: {
      fields: [
        { name: "requirements", labelZh: "任务要求", labelEn: "Task requirements", type: "textarea", required: true },
        { name: "cameraMotion", labelZh: "镜头运动", labelEn: "Camera motion", type: "textarea", required: true },
      ],
    },
  };
}

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

  it("surfaces a recoverable error when conflicting Skills are selected", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network must not be used"))));
    render(<VaultProvider><GeneratorPage /></VaultProvider>);

    await userEvent.type(await screen.findByLabelText("任务要求"), "提升画面质感");
    await userEvent.click(screen.getByLabelText("自然光保持"));
    await userEvent.click(screen.getByLabelText("黄金时刻光线"));
    await userEvent.click(screen.getByRole("button", { name: "生成 Prompt" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toBeVisible();
    expect(alert).toHaveTextContent("所选 Skill 存在冲突");
    expect(alert).toHaveTextContent("自然光保持");
    expect(alert).toHaveTextContent("黄金时刻光线");
    expect(alert).not.toHaveTextContent("natural-light-preservation");
  });

  it("invalidates a generated result when the form changes", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network must not be used"))));
    render(<VaultProvider><GeneratorPage /></VaultProvider>);

    const requirements = await screen.findByLabelText("任务要求");
    await userEvent.type(requirements, "生成时的旧需求");
    await userEvent.click(screen.getByRole("button", { name: "生成 Prompt" }));
    expect(await screen.findByText(/任务要求：[\s\S]*生成时的旧需求/)).toBeVisible();
    expect(screen.getByRole("button", { name: "保存到 Prompt 库" })).toBeEnabled();

    await userEvent.clear(requirements);
    await userEvent.type(requirements, "修改后的新需求");

    expect(screen.queryByText(/任务要求：[\s\S]*生成时的旧需求/)).toBeNull();
    expect(screen.queryByRole("button", { name: "保存到 Prompt 库" })).toBeNull();
    expect(screen.getByRole("heading", { name: "等待生成" })).toBeVisible();
  });

  it("saves generated video-model Prompts with VIDEO media type", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network must not be used"))));
    render(<VaultProvider><GeneratorPage /></VaultProvider>);

    await userEvent.selectOptions(await screen.findByLabelText("模型"), "kling-3");
    await userEvent.type(screen.getByLabelText("任务要求"), "生成一段镜头缓慢推进的视频");
    await userEvent.click(screen.getByRole("button", { name: "生成 Prompt" }));
    await userEvent.click(await screen.findByRole("button", { name: "保存到 Prompt 库" }));

    await waitFor(async () => {
      const saved = await createPromptRepository().list({ sort: "createdAt", order: "desc" });
      const prompt = saved.find(({ title }) => title === "生成一段镜头缓慢推进的视频");
      expect(prompt?.mediaType).toBe("VIDEO");
    });
  });

  it("renders a custom two-field template schema and resolves both placeholders", async () => {
    await createKnowledgeRepository().save(dualFieldTemplate());
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network must not be used"))));
    render(<VaultProvider><GeneratorPage /></VaultProvider>);

    await screen.findByLabelText("模板");
    const requirements = screen.getByLabelText("任务要求");
    const cameraMotion = screen.getByLabelText("镜头运动");
    const generate = screen.getByRole("button", { name: "生成 Prompt" });

    expect(generate).toBeDisabled();
    await userEvent.type(requirements, "把白天改成蓝调夜景");
    expect(generate).toBeDisabled();
    await userEvent.type(cameraMotion, "缓慢推进");
    expect(generate).toBeEnabled();

    await userEvent.click(generate);

    expect(await screen.findByText(/任务要求：[\s\S]*把白天改成蓝调夜景/)).toBeVisible();
    expect(await screen.findByText(/镜头运动：[\s\S]*缓慢推进/)).toBeVisible();
    expect(screen.getByText(/Camera motion:[\s\S]*缓慢推进/)).toBeVisible();
    expect(screen.getByText(/Task requirements:[\s\S]*Original Chinese requirement: 把白天改成蓝调夜景/)).toBeVisible();
  });

  it("clears previous template field values when switching templates", async () => {
    await createKnowledgeRepository().save(dualFieldTemplate());
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network must not be used"))));
    render(<VaultProvider><GeneratorPage /></VaultProvider>);

    await screen.findByLabelText("模板");
    await userEvent.type(screen.getByLabelText("任务要求"), "把白天改成蓝调夜景");
    await userEvent.type(screen.getByLabelText("镜头运动"), "缓慢推进");
    await userEvent.click(screen.getByRole("button", { name: "生成 Prompt" }));
    expect(await screen.findByText(/镜头运动：[\s\S]*缓慢推进/)).toBeVisible();

    const templateSelect = screen.getByLabelText("模板");
    await userEvent.selectOptions(templateSelect, screen.getByRole("option", { name: "图片生成基础模板" }));
    await waitFor(() => expect(screen.queryByLabelText("镜头运动")).toBeNull());
    expect(screen.getByLabelText("任务要求")).toHaveValue("");
    expect(screen.queryByRole("button", { name: "保存到 Prompt 库" })).toBeNull();

    await userEvent.type(screen.getByLabelText("任务要求"), "切换后的新要求");
    await userEvent.click(screen.getByRole("button", { name: "生成 Prompt" }));

    expect(await screen.findByText(/任务要求：[\s\S]*切换后的新要求/)).toBeVisible();
    await waitFor(() => expect(screen.queryByText(/缓慢推进/)).toBeNull());
  });
});
