import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type { SkillInput, TemplateInput } from "@promptvault/contracts";

export class KnowledgeService {
  constructor(private readonly prisma: PrismaClient) {}

  listModels() {
    return this.prisma.model.findMany({ where: { enabled: true }, orderBy: { order: "asc" }, include: { tasks: { where: { enabled: true }, orderBy: { order: "asc" }, include: { templates: { where: { enabled: true }, orderBy: { version: "desc" }, take: 1 } } } } });
  }

  listTasks(modelId: string) {
    return this.prisma.modelTask.findMany({ where: { modelId, enabled: true }, orderBy: { order: "asc" }, include: { model: true, templates: { where: { enabled: true }, orderBy: { version: "desc" } } } });
  }

  listSkills(modelTaskId?: string) {
    return this.prisma.promptSkill.findMany({
      where: { enabled: true, ...(modelTaskId ? { modelTasks: { some: { modelTaskId } } } : {}) },
      orderBy: [{ priority: "desc" }, { nameZh: "asc" }],
      include: { modelTasks: { select: { modelTaskId: true } } },
    }).then((skills) => skills.map((skill) => ({ ...skill, modelTaskIds: skill.modelTasks.map((item) => item.modelTaskId) })));
  }

  listTemplates(modelTaskId?: string) {
    return this.prisma.promptTemplate.findMany({ where: { enabled: true, ...(modelTaskId ? { modelTaskId } : {}) }, orderBy: [{ modelTaskId: "asc" }, { version: "desc" }] });
  }

  listPersonalRules(modelTaskId?: string) {
    return this.prisma.personalRule.findMany({ where: { enabled: true, OR: [{ modelTaskId: null }, ...(modelTaskId ? [{ modelTaskId }] : [])] }, orderBy: { priority: "desc" } });
  }

  listCategories() { return this.prisma.category.findMany({ include: { children: true }, orderBy: { name: "asc" } }); }
  listTags() { return this.prisma.tag.findMany({ orderBy: { name: "asc" } }); }

  async createSkill(input: SkillInput) {
    return this.prisma.promptSkill.create({
      data: {
        stableKey: `user-${randomUUID()}`,
        nameZh: input.nameZh, nameEn: input.nameEn, descriptionZh: input.descriptionZh, descriptionEn: input.descriptionEn,
        contentZh: input.contentZh, contentEn: input.contentEn, category: input.category, priority: input.priority,
        conflictGroup: input.conflictGroup, enabled: input.enabled, owner: "USER",
        modelTasks: { create: input.modelTaskIds.map((modelTaskId) => ({ modelTask: { connect: { id: modelTaskId } } })) },
      },
      include: { modelTasks: { select: { modelTaskId: true } } },
    }).then((skill) => ({ ...skill, modelTaskIds: skill.modelTasks.map((item) => item.modelTaskId) }));
  }

  async createTemplate(input: TemplateInput) {
    return this.prisma.promptTemplate.create({
      data: {
        stableKey: `user-${randomUUID()}`, modelTaskId: input.modelTaskId, nameZh: input.nameZh, nameEn: input.nameEn,
        descriptionZh: input.descriptionZh, descriptionEn: input.descriptionEn, templateZh: input.templateZh, templateEn: input.templateEn,
        fieldSchema: input.fieldSchema, enabled: input.enabled, owner: "USER",
      },
    });
  }
}
