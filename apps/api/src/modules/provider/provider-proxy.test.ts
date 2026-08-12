import { describe, expect, it } from "vitest";
import { assertSafeProviderUrl } from "./provider-proxy.js";

describe("Provider URL validation", () => {
  it.each(["file:///etc/passwd", "http://127.0.0.1:3000/v1", "https://localhost/v1", "https://169.254.169.254/latest", "https://user:pass@example.com/v1"])("rejects unsafe upstream %s", async (url) => {
    await expect(assertSafeProviderUrl(url)).rejects.toMatchObject({ code: "PROVIDER_REJECTED" });
  });
});
