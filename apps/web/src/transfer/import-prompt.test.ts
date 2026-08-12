import { afterEach, describe, expect, it } from "vitest";
import type { PromptRecord } from "../domain/types";
import { createKnowledgeRepository } from "../vault/knowledge-repository";
import { deleteVault } from "../vault/open-vault";
import { createPromptRepository } from "../vault/prompt-repository";
import { createSettingsRepository } from "../vault/settings-repository";
import { createVaultTransaction } from "../vault/vault-transaction";
import { exportPromptPackage } from "./export-prompt";
import { applyPromptImport, previewPromptImport } from "./import-prompt";

const base: PromptRecord = { id: "p1", title: "本地版本", description: "", contentZh: "本地", contentEn: "Local", negativeZh: "", negativeEn: "", mediaType: "IMAGE", category: "通用", tags: [], favorite: false, rating: 0, origin: "MANUAL", createdAt: "2026-08-12T00:00:00.000Z", updatedAt: "2026-08-12T00:00:00.000Z" };
const repositories = () => ({ prompts: createPromptRepository(), knowledge: createKnowledgeRepository(), settings: createSettingsRepository(), transaction: createVaultTransaction() });

afterEach(deleteVault);

describe("Prompt import", () => {
  it("creates a conflict copy instead of overwriting a local Prompt", async () => {
    const deps = repositories();
    await deps.prompts.create(base, []);
    const incoming = { ...base, title: "导入版本", contentZh: "导入内容", updatedAt: "2026-08-12T01:00:00.000Z" };
    const preview = await previewPromptImport(await exportPromptPackage({ prompts: [incoming], assets: [] }), deps);

    expect(preview.promptActions).toEqual([{ sourceId: "p1", targetId: expect.any(String), action: "COPY", reason: "ID_CONTENT_CONFLICT" }]);
    await applyPromptImport(preview, { includeSettings: false, includeKnowledge: false }, deps);

    expect(await deps.prompts.get("p1")).toEqual(base);
    const records = await deps.prompts.list({ sort: "updatedAt", order: "desc" });
    expect(records.some(({ title }) => title === "导入版本")).toBe(true);
  });

  it("skips an exact duplicate", async () => {
    const deps = repositories();
    await deps.prompts.create(base, []);
    const preview = await previewPromptImport(await exportPromptPackage({ prompts: [base], assets: [] }), deps);
    expect(preview.promptActions).toEqual([{ sourceId: "p1", targetId: "p1", action: "SKIP", reason: "EXACT_DUPLICATE" }]);
  });
});
