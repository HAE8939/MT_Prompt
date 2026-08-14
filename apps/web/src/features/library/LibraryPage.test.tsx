import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PromptAsset, PromptRecord } from "../../domain/types";
import { deleteVault } from "../../vault/open-vault";
import { createPromptRepository } from "../../vault/prompt-repository";
import { createSettingsRepository } from "../../vault/settings-repository";
import { VaultProvider } from "../../vault/VaultProvider";
import { InterfaceSettingsProvider } from "../../settings/InterfaceSettingsProvider";
import { LibraryPage } from "./LibraryPage";

const now = "2026-08-12T00:00:00.000Z";
function prompt(id: string, title: string, mediaType: "IMAGE" | "VIDEO", favorite = false): PromptRecord {
  return { id, title, description: "", contentZh: `${title} 中文`, contentEn: `${title} English`, negativeZh: "", negativeEn: "", mediaType, category: "测试", tags: [], favorite, rating: 0, origin: "MANUAL", createdAt: now, updatedAt: now };
}

describe("LibraryPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network must not be used"))));
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:cover"), revokeObjectURL: vi.fn() });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn(() => Promise.resolve()) },
      configurable: true,
      writable: true,
    });
  });
  afterEach(async () => { cleanup(); vi.unstubAllGlobals(); await deleteVault(); });

  it("filters local Prompts by image, video, and favorite", async () => {
    const repository = createPromptRepository();
    await repository.create(prompt("local-image", "本地图像", "IMAGE"), []);
    await repository.create(prompt("local-video", "本地视频", "VIDEO", true), []);
    render(<VaultProvider><InterfaceSettingsProvider><LibraryPage /></InterfaceSettingsProvider></VaultProvider>);
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
    render(<VaultProvider><InterfaceSettingsProvider><LibraryPage /></InterfaceSettingsProvider></VaultProvider>);
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
    render(<VaultProvider><InterfaceSettingsProvider><LibraryPage /></InterfaceSettingsProvider></VaultProvider>);

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
    render(<VaultProvider><InterfaceSettingsProvider><LibraryPage /></InterfaceSettingsProvider></VaultProvider>);
    await screen.findByRole("button", { name: "导入 .prompt" });
    expect(fetch).not.toHaveBeenCalledWith(expect.stringMatching(/^https?:\/\//));
  });

  it("uses a native button to open the Prompt package picker", async () => {
    render(<VaultProvider><InterfaceSettingsProvider><LibraryPage /></InterfaceSettingsProvider></VaultProvider>);
    const importButton = await screen.findByRole("button", { name: "导入 .prompt" });
    expect(importButton.tagName).toBe("BUTTON");
    expect(importButton).not.toContainElement(screen.getByLabelText("选择 .prompt 文件"));
  });

  it("initializes the library grid from the saved default view", async () => {
    await createSettingsRepository().saveInterface({ theme: "system", language: "zh-CN", libraryView: "grid", compact: true });
    render(<VaultProvider><InterfaceSettingsProvider><LibraryPage /></InterfaceSettingsProvider></VaultProvider>);
    await waitFor(() => expect(screen.getByRole("button", { name: "网格视图" })).toHaveClass("active"));
  });

  it("exposes named copy buttons for both languages", async () => {
    const repository = createPromptRepository();
    await repository.create(prompt("copy-both", "复制双语文案", "IMAGE"), []);
    render(<VaultProvider><InterfaceSettingsProvider><LibraryPage /></InterfaceSettingsProvider></VaultProvider>);
    await userEvent.click(await screen.findByRole("button", { name: "打开复制双语文案" }));
    expect(screen.getByRole("button", { name: "复制中文 Prompt" })).toBeVisible();
    expect(screen.getByRole("button", { name: "复制英文 Prompt" })).toBeVisible();
  });

  it("reflects a successful copy on the matching language button", async () => {
    const repository = createPromptRepository();
    await repository.create(prompt("copy-ok", "复制成功", "IMAGE"), []);
    render(<VaultProvider><InterfaceSettingsProvider><LibraryPage /></InterfaceSettingsProvider></VaultProvider>);
    await userEvent.click(await screen.findByRole("button", { name: "打开复制成功" }));
    const zhCopy = screen.getByRole("button", { name: "复制中文 Prompt" });
    await userEvent.click(zhCopy);
    await waitFor(() => expect(zhCopy).toHaveTextContent("已复制"));
  });

  it("shows an accessible alert when clipboard copy fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn(() => Promise.reject(new Error("denied"))) },
      configurable: true,
      writable: true,
    });
    const repository = createPromptRepository();
    await repository.create(prompt("copy-fail", "复制失败", "IMAGE"), []);
    render(<VaultProvider><InterfaceSettingsProvider><LibraryPage /></InterfaceSettingsProvider></VaultProvider>);
    await userEvent.click(await screen.findByRole("button", { name: "打开复制失败" }));
    await userEvent.click(screen.getByRole("button", { name: "复制中文 Prompt" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/复制失败/);
  });

  it("opens a full media viewer from the detail cover and closes it", async () => {
    const repository = createPromptRepository();
    const record = prompt("viewer", "完整媒体查看", "IMAGE");
    const asset: PromptAsset = { id: "cover", promptId: record.id, role: "COVER", blob: new Blob(["image"], { type: "image/png" }), mimeType: "image/png", originalName: "cover.png", byteSize: 5, checksum: "x", createdAt: now };
    await repository.create(record, [asset]);
    render(<VaultProvider><InterfaceSettingsProvider><LibraryPage /></InterfaceSettingsProvider></VaultProvider>);
    await userEvent.click(await screen.findByRole("button", { name: "打开完整媒体查看" }));
    await userEvent.click(screen.getByRole("button", { name: "查看完整媒体" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("img", { name: "完整媒体查看封面" })).toHaveAttribute("src", "blob:cover");
    await userEvent.click(within(dialog).getByRole("button", { name: "关闭查看器" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("renders the detail cover as a non-cropping button with the detail-image class", async () => {
    const repository = createPromptRepository();
    const record = prompt("contain", "不裁剪封面", "IMAGE");
    const asset: PromptAsset = { id: "cover", promptId: record.id, role: "COVER", blob: new Blob(["image"], { type: "image/png" }), mimeType: "image/png", originalName: "cover.png", byteSize: 5, checksum: "x", createdAt: now };
    await repository.create(record, [asset]);
    render(<VaultProvider><InterfaceSettingsProvider><LibraryPage /></InterfaceSettingsProvider></VaultProvider>);
    await userEvent.click(await screen.findByRole("button", { name: "打开不裁剪封面" }));
    expect(screen.getByRole("button", { name: "查看完整媒体" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "不裁剪封面封面" })).toHaveClass("detail-image");
  });
});
