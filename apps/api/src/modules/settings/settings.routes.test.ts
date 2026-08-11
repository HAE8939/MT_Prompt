import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";
import type { CredentialStore } from "./credential-store.js";

class MemoryCredentialStore implements CredentialStore {
  private readonly values = new Map<string, string>();
  async set(service: string, secret: string) { this.values.set(service, secret); }
  async get(service: string) { return this.values.get(service) ?? null; }
  async remove(service: string) { this.values.delete(service); }
}

const prisma = new PrismaClient();

describe("Settings routes", () => {
  afterAll(async () => prisma.$disconnect());

  it("stores translation credentials without returning the API key", async () => {
    const app = await buildApp({ prisma, credentialStore: new MemoryCredentialStore() });
    const saved = await app.inject({
      method: "PUT",
      url: "/api/v1/settings/translation-provider",
      payload: { provider: "openai", apiKey: "test-secret-value", model: "gpt-5-mini" },
    });
    const status = await app.inject({ method: "GET", url: "/api/v1/settings/status" });

    expect(saved.statusCode).toBe(204);
    expect(status.statusCode).toBe(200);
    expect(status.json()).toMatchObject({ translation: { provider: "openai", configured: true, model: "gpt-5-mini" } });
    expect(`${saved.body}${status.body}`).not.toContain("test-secret-value");
    await app.close();
  });
});
