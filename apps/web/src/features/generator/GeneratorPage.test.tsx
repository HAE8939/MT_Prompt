import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPromptRepository } from "../../vault/prompt-repository";
import { deleteVault } from "../../vault/open-vault";
import { VaultProvider } from "../../vault/VaultProvider";
import { GeneratorPage } from "./GeneratorPage";

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
    await userEvent.click(screen.getByLabelText("空间一致性"));
    await userEvent.click(screen.getByRole("button", { name: "生成 Prompt" }));

    expect(await screen.findByText(/任务要求：将白天改成蓝调夜景/)).toBeVisible();
    expect(screen.getByText(/Task requirement:/)).toBeVisible();
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
});
