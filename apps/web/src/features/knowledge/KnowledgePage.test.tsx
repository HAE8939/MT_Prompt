import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createKnowledgeRepository } from "../../vault/knowledge-repository";
import { deleteVault } from "../../vault/open-vault";
import { VaultProvider } from "../../vault/VaultProvider";
import { KnowledgePage } from "./KnowledgePage";

afterEach(async () => { cleanup(); vi.unstubAllGlobals(); await deleteVault(); });

const TABS = ["模型与任务", "模板", "Skill", "个人规则"];

describe("KnowledgePage", () => {
  it("exposes four full-width tabs and renders every model in the coverage tab", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network must not be used"))));
    render(<VaultProvider><KnowledgePage /></VaultProvider>);
    for (const name of TABS) {
      expect(await screen.findByRole("button", { name })).toBeVisible();
    }
    // The default tab is the model/task coverage board.
    expect(screen.getByText("GPT-IMAGE 2")).toBeVisible();
    expect(screen.getByText("Nano Banana 2")).toBeVisible();
    expect(screen.getByText("Kling 3.0")).toBeVisible();
    expect(screen.getByText("Seedance 2.0")).toBeVisible();
  });

  it("filters the active template catalog through search", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network must not be used"))));
    render(<VaultProvider><KnowledgePage /></VaultProvider>);
    await userEvent.click(await screen.findByRole("button", { name: "模板" }));
    await userEvent.type(await screen.findByLabelText("搜索知识"), "电影分镜");
    await waitFor(() => expect(screen.getByText("电影分镜基础模板")).toBeVisible());
    expect(screen.queryByText("多镜头视频基础模板")).not.toBeInTheDocument();
  });

  it("edits a built-in Skill as a user copy", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network must not be used"))));
    render(<VaultProvider><KnowledgePage /></VaultProvider>);
    await userEvent.click(await screen.findByRole("button", { name: "Skill" }));
    await userEvent.click(await screen.findByRole("button", { name: "编辑 角色一致性" }));
    await userEvent.clear(screen.getByLabelText("中文内容"));
    await userEvent.type(screen.getByLabelText("中文内容"), "保持角色与场景风格连续一致");
    await userEvent.click(screen.getByRole("button", { name: "保存知识" }));
    await waitFor(async () => expect((await createKnowledgeRepository().list("SKILL")).filter(({ owner }) => owner === "USER").length).toBe(1));
    expect(screen.getByText("用户副本")).toBeVisible();
    expect(fetch).not.toHaveBeenCalledWith(expect.stringMatching(/^https?:\/\//));
  });
});
