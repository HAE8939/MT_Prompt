import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "./clipboard";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("copyText", () => {
  it("uses selection copy when the Clipboard API is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    const execCommand = vi.fn(() => true);
    Object.defineProperty(document, "execCommand", { value: execCommand, configurable: true });

    await expect(copyText("HTTP copy")).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
  });
});
