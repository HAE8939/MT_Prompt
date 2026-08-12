import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createKnowledgeRepository } from "../../vault/knowledge-repository";
import { deleteVault } from "../../vault/open-vault";
import { VaultProvider } from "../../vault/VaultProvider";
import { KnowledgePage } from "./KnowledgePage";

afterEach(async () => { cleanup(); vi.unstubAllGlobals(); await deleteVault(); });

describe("KnowledgePage", () => {
  it("switches local kinds and edits a built-in as a user copy", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network must not be used"))));
    render(<VaultProvider><KnowledgePage /></VaultProvider>);
    expect(await screen.findByText("通用设计提示词")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Skill" }));
    await userEvent.click(await screen.findByRole("button", { name: "编辑 空间一致性" }));
    await userEvent.clear(screen.getByLabelText("中文内容")); await userEvent.type(screen.getByLabelText("中文内容"), "保持空间和材质一致");
    await userEvent.click(screen.getByRole("button", { name: "保存知识" }));
    await waitFor(async () => expect((await createKnowledgeRepository().list("SKILL")).filter(({ owner }) => owner === "USER")).toHaveLength(1));
    expect(screen.getByText("用户副本")).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });
});
