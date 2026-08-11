import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { IntegrityService } from "./integrity.service.js";

describe("IntegrityService", () => {
  it("reports missing and orphan files without modifying storage", async () => {
    const root = await mkdtemp(join(tmpdir(), "promptvault-integrity-"));
    await mkdir(join(root, "images"));
    await writeFile(join(root, "images", "orphan.png"), "orphan");
    const prisma = { asset: { findMany: async () => [{ storageKey: "images/missing.png" }] } };
    const report = await new IntegrityService(prisma as never, root).scan();
    expect(report.missingFiles).toEqual(["images/missing.png"]);
    expect(report.orphanFiles).toEqual(["images/orphan.png"]);
  });
});
