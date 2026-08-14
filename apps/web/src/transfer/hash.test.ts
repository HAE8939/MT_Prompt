import { afterEach, describe, expect, it, vi } from "vitest";
import { sha256 } from "./hash";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sha256", () => {
  it("returns the standard digest when SubtleCrypto is unavailable", async () => {
    vi.stubGlobal("crypto", undefined);

    await expect(sha256(new TextEncoder().encode("hello"))).resolves.toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });
});
