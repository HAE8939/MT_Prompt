import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp } from "./app.js";

describe("GET /health", () => {
  it("reports the service as ready", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
    await app.close();
  });
});

describe("static application delivery", () => {
  it("serves the Web build and falls back for client routes", async () => {
    const root = await mkdtemp(join(tmpdir(), "mt-prompt-web-"));
    await writeFile(join(root, "index.html"), "<main>MT-Prompt production</main>");
    const app = await buildApp({ staticRoot: root });

    expect((await app.inject({ method: "GET", url: "/" })).body).toContain("MT-Prompt production");
    expect((await app.inject({ method: "GET", url: "/settings" })).body).toContain("MT-Prompt production");
    expect((await app.inject({ method: "GET", url: "/api/v1/prompts" })).statusCode).toBe(404);
    await app.close();
  });
});
