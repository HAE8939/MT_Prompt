import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../../app.js";

describe("Provider proxy route", () => {
  it("forwards an allowed request without persisting credentials", async () => {
    const upstream = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200, headers: { "content-type": "application/json" } }));
    const app = await buildApp({ fetch: upstream, resolveHostname: async () => ["93.184.216.34"] });
    const response = await app.inject({ method: "POST", url: "/api/provider/chat/completions", payload: { baseUrl: "https://provider.example/v1", model: "model-a", apiKey: "secret", messages: [{ role: "user", content: "hello" }] } });
    expect(response.statusCode).toBe(200);
    expect(upstream).toHaveBeenCalledWith("https://provider.example/v1/chat/completions", expect.objectContaining({ redirect: "error", headers: expect.objectContaining({ authorization: "Bearer secret" }) }));
    await app.close();
  });

  it("does not expose legacy user-data routes", async () => {
    const app = await buildApp();
    expect((await app.inject({ method: "GET", url: "/api/v1/prompts" })).statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: "/health" })).statusCode).toBe(200);
    await app.close();
  });
});
