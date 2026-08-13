import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PromptAsset, PromptRecord } from "../../domain/types";
import { deleteVault } from "../../vault/open-vault";
import { createPromptRepository } from "../../vault/prompt-repository";
import { VaultProvider } from "../../vault/VaultProvider";
import { LibraryPage } from "./LibraryPage";

const now = "2026-08-12T00:00:00.000Z";
function prompt(id: string, title: string, mediaType: "IMAGE" | "VIDEO", favorite = false): PromptRecord {
  return { id, title, description: "", contentZh: `${title} 中文`, contentEn: `${title} English`, negativeZh: "", negativeEn: "", mediaType, category: "测试", tags: [], favorite, rating: 0, origin: "MANUAL", createdAt: now, updatedAt: now };
}

describe("LibraryPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network must not be used"))));
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:cover"), revokeObjectURL: vi.fn() });
  });
  afterEach(async () => { cleanup(); vi.unstubAllGlobals(); await deleteVault(); });

  it("filters local Prompts by image, video, and favorite", async () => {
    const repository = createPromptRepository();
    await repository.create(prompt("local-image", "本地图像", "IMAGE"), []);
    await repository.create(prompt("local-video", "本地视频", "VIDEO", true), []);
    render(<VaultProvider><LibraryPage /></VaultProvider>);
    expect(await screen.findByText("本地图像")).toBeVisible();
    expect(screen.getByText("本地视频")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "图片" }));
    await waitFor(() => expect(screen.queryByText("本地视频")).not.toBeInTheDocument());
    expect(screen.getByText("本地图像")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "收藏" }));
    await waitFor(() => expect(screen.queryByText("本地图像")).not.toBeInTheDocument());
    expect(screen.getByText("本地视频")).toBeVisible();
  });

  it("opens a Prompt detail with its Blob cover and edits content", async () => {
    const repository = createPromptRepository(); const record = prompt("with-cover", "含封面提示词", "IMAGE");
    const asset: PromptAsset = { id: "cover", promptId: record.id, role: "COVER", blob: new Blob(["image"], { type: "image/png" }), mimeType: "image/png", originalName: "cover.png", byteSize: 5, checksum: "x", createdAt: now };
    await repository.create(record, [asset]);
    render(<VaultProvider><LibraryPage /></VaultProvider>);
    await userEvent.click(await screen.findByRole("button", { name: "打开含封面提示词" }));
    expect(await screen.findByRole("img", { name: "含封面提示词封面" })).toHaveAttribute("src", "blob:cover");
    await userEvent.click(screen.getByRole("button", { name: "编辑 Prompt" }));
    await userEvent.clear(screen.getByLabelText("标题")); await userEvent.type(screen.getByLabelText("标题"), "已修改标题");
    await userEvent.click(screen.getByRole("button", { name: "保存修改" }));
    await waitFor(() => expect(screen.getAllByText("已修改标题")).toHaveLength(2));
  });

  it("adds and removes local media while editing a Prompt", async () => {
    const repository = createPromptRepository();
    const record = prompt("media-edit", "素材编辑", "IMAGE");
    const oldAsset: PromptAsset = { id: "old-cover", promptId: record.id, role: "COVER", blob: new Blob(["old"], { type: "image/png" }), mimeType: "image/png", originalName: "old.png", byteSize: 3, checksum: "old", createdAt: now };
    await repository.create(record, [oldAsset]);
    render(<VaultProvider><LibraryPage /></VaultProvider>);

    await userEvent.click(await screen.findByRole("button", { name: "打开素材编辑" }));
    await userEvent.click(screen.getByRole("button", { name: "编辑 Prompt" }));
    await userEvent.click(screen.getByRole("button", { name: "删除素材 old.png" }));
    await userEvent.upload(screen.getByLabelText("添加图片或视频素材"), new File(["new-image"], "new.webp", { type: "image/webp" }));
    expect(await screen.findByText("new.webp")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "保存修改" }));

    await waitFor(async () => {
      const stored = await repository.listAssets(record.id);
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({ originalName: "new.webp", mimeType: "image/webp", role: "COVER" });
    });
  });

  it("never requests the legacy Prompt API", async () => {
    render(<VaultProvider><LibraryPage /></VaultProvider>);
    await screen.findByRole("button", { name: "导入 .prompt" });
    expect(fetch).not.toHaveBeenCalledWith(expect.stringMatching(/^https?:\/\//));
  });
});
