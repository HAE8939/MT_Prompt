import { translationSettingsSchema } from "@promptvault/contracts";
import type { FastifyInstance } from "fastify";
import type { SettingsService } from "./settings.service.js";

export async function registerSettingsRoutes(app: FastifyInstance, service: SettingsService) {
  app.get("/api/v1/settings/status", async () => service.getStatus());
  app.put("/api/v1/settings/translation-provider", async (request, reply) => {
    await service.setTranslation(translationSettingsSchema.parse(request.body));
    return reply.code(204).send();
  });
  app.post("/api/v1/settings/translation-provider/test", async (_request, reply) => {
    const provider = await service.getProvider();
    await provider.translate({ test: "一间安静的蓝调客厅" });
    return reply.code(204).send();
  });
}
