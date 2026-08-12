import { afterEach, describe, expect, it } from "vitest";
import { deleteVault } from "./open-vault";
import { createSettingsRepository } from "./settings-repository";

afterEach(() => deleteVault());

describe("settings repository", () => {
  it("keeps Provider credentials outside portable interface settings", async () => {
    const settings = createSettingsRepository();
    await settings.saveProvider({ baseUrl: "https://example.com", model: "m", apiKey: "secret" });
    await settings.saveInterface({ theme: "light", language: "zh-CN", libraryView: "list", compact: true });

    expect((await settings.getProvider())?.apiKey).toBe("secret");
    expect(JSON.stringify(await settings.getPortableInterface())).not.toContain("secret");
  });
});
