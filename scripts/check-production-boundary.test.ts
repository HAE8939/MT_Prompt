import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectProductionBoundary } from "./check-production-boundary";

describe("production boundary", () => {
  it("ships no server-side user data store or persistent volume", async () => {
    const report = await inspectProductionBoundary(resolve(import.meta.dirname, ".."));
    expect(report.copiedUserDataPaths).toEqual([]);
    expect(report.persistentVolumes).toEqual([]);
    expect(report.runtimePackages.sort()).toEqual(["@fastify/static@10.1.3", "fastify@5.5.0"]);
  });
});
