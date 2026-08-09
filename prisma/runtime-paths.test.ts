import { access, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ensureRuntimePaths } from "./ensure-runtime-paths.js";

describe("ensureRuntimePaths", () => {
  it("creates the SQLite file and asset directories without overwriting data", async () => {
    const root = await mkdtemp(join(tmpdir(), "promptvault-paths-"));

    const paths = await ensureRuntimePaths(root);
    await access(paths.databaseFile);
    await access(join(root, "storage", "images", "cover"));
    await access(join(root, "storage", "images", "reference"));

    await ensureRuntimePaths(root);
    expect(await readFile(paths.databaseFile)).toHaveLength(0);
  });
});
