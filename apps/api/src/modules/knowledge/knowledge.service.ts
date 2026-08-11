import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { PersonalRuleInput, PersonalRuleUpdateInput, SkillInput, SkillUpdateInput, TemplateInput, TemplateUpdateInput } from "@promptvault/contracts";

export class KnowledgeService {
  constructor(private readonly prisma: PrismaClient) {}

  listModels() {
    return this.prisma.model.findMany({ where: { enabled: true }, orderBy: { order: "asc" }, include: { tasks: { where: { enabled: true }, orderBy: { order: "asc" }, include: { templates: { where: { enabled: true }, orderBy: { version: "desc" }, take: 1 } } } } });
  }

  listTasks(modelId: string) {
    return this.prisma.modelTask.findMany({ where: { modelId, enabled: true }, orderBy: { order: "asc" }, include: { model: true, templates: { where: { enabled: true }, orderBy: { version: "desc" } } } });
  }

  listSkills(modelTaskId?: string, includeDisabled = false) {
    return this.prisma.promptSkill.findMany({
      where: { ...(!includeDisabled ? { enabled: true } : {}), ...(modelTaskId ? { modelTasks: { some: { modelTaskId } } } : {}) },
      orderBy: [{ priority: "desc" }, { nameZh: "asc" }],
      include: { modelTasks: { select: { modelTaskId: true } } },
    }).then((skills) => skills.map((skill) => ({ ...skill, modelTaskIds: skill.modelTasks.map((item) => item.modelTaskId) })));
  }

  listTemplates(modelTaskId?: string, includeDisabled = false) {
    return this.prisma.promptTemplate.findMany({ where: { ...(!includeDisabled ? { enabled: true } : {}), ...(modelTaskId ? { modelTaskId } : {}) }, orderBy: [{ modelTaskId: "asc" }, { version: "desc" }] });
  }

  listPersonalRules(modelTaskId?: string, includeDisabled = false) {
    return this.prisma.personalRule.findMany({ where: { ...(!includeDisabled ? { enabled: true } : {}), ...(modelTaskId ? { OR: [{ modelTaskId: null }, { modelTaskId }] } : {}) }, orderBy: { priority: "desc" } });
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

  async updateSkill(id: string, input: SkillUpdateInput) {
    const current = await this.prisma.promptSkill.findUniqueOrThrow({ where: { id }, include: { modelTasks: true } });
    const modelTaskIds = input.modelTaskIds ?? current.modelTasks.map((item) => item.modelTaskId);
    const data = {
      nameZh: input.nameZh ?? current.nameZh, nameEn: input.nameEn ?? current.nameEn,
      descriptionZh: input.descriptionZh ?? current.descriptionZh ?? "", descriptionEn: input.descriptionEn ?? current.descriptionEn ?? "",
      contentZh: input.contentZh ?? current.contentZh, contentEn: input.contentEn ?? current.contentEn,
      category: input.category ?? current.category, priority: input.priority ?? current.priority,
      conflictGroup: input.conflictGroup === undefined ? current.conflictGroup : input.conflictGroup,
      enabled: input.enabled ?? current.enabled,
    };
    return this.prisma.$transaction(async (tx) => {
      if (current.owner === "BUILT_IN") {
        return tx.promptSkill.create({ data: { ...data, stableKey: `user-${randomUUID()}`, owner: "USER", modelTasks: { create: modelTaskIds.map((modelTaskId) => ({ modelTaskId })) } }, include: { modelTasks: true } });
      }
      await tx.skillModelTask.deleteMany({ where: { skillId: id } });
      return tx.promptSkill.update({ where: { id }, data: { ...data, version: { increment: 1 }, modelTasks: { create: modelTaskIds.map((modelTaskId) => ({ modelTaskId })) } }, include: { modelTasks: true } });
    }).then((skill) => ({ ...skill, modelTaskIds: skill.modelTasks.map((item) => item.modelTaskId) }));
  }

  async deleteSkill(id: string) {
    const current = await this.prisma.promptSkill.findUniqueOrThrow({ where: { id } });
    if (current.owner === "BUILT_IN") throw new Error("BUILT_IN_PROTECTED");
    await this.prisma.promptSkill.delete({ where: { id } });
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

  async updateTemplate(id: string, input: TemplateUpdateInput) {
    const current = await this.prisma.promptTemplate.findUniqueOrThrow({ where: { id } });
    const data = {
      modelTaskId: input.modelTaskId ?? current.modelTaskId, nameZh: input.nameZh ?? current.nameZh, nameEn: input.nameEn ?? current.nameEn,
      descriptionZh: input.descriptionZh ?? current.descriptionZh ?? "", descriptionEn: input.descriptionEn ?? current.descriptionEn ?? "",
      templateZh: input.templateZh ?? current.templateZh, templateEn: input.templateEn ?? current.templateEn,
      fieldSchema: input.fieldSchema ?? current.fieldSchema as Prisma.InputJsonValue, enabled: input.enabled ?? current.enabled,
    };
    if (current.owner === "BUILT_IN") return this.prisma.promptTemplate.create({ data: { ...data, stableKey: `user-${randomUUID()}`, owner: "USER", version: current.version + 1 } });
    return this.prisma.promptTemplate.update({ where: { id }, data: { ...data, version: { increment: 1 } } });
  }

  async deleteTemplate(id: string) {
    const current = await this.prisma.promptTemplate.findUniqueOrThrow({ where: { id } });
    if (current.owner === "BUILT_IN") throw new Error("BUILT_IN_PROTECTED");
    await this.prisma.promptTemplate.delete({ where: { id } });
  }

  createPersonalRule(input: PersonalRuleInput) {
    return this.prisma.personalRule.create({ data: { ...input, modelTaskId: input.modelTaskId ?? null, stableKey: `user-${randomUUID()}`, owner: "USER" } });
  }

  async updatePersonalRule(id: string, input: PersonalRuleUpdateInput) {
    const current = await this.prisma.personalRule.findUniqueOrThrow({ where: { id } });
    const data = {
      modelTaskId: input.modelTaskId === undefined ? current.modelTaskId : input.modelTaskId,
      nameZh: input.nameZh ?? current.nameZh, nameEn: input.nameEn ?? current.nameEn,
      contentZh: input.contentZh ?? current.contentZh, contentEn: input.contentEn ?? current.contentEn,
      priority: input.priority ?? current.priority, enabled: input.enabled ?? current.enabled,
    };
    if (current.owner === "BUILT_IN") return this.prisma.personalRule.create({ data: { ...data, stableKey: `user-${randomUUID()}`, owner: "USER" } });
    return this.prisma.personalRule.update({ where: { id }, data: { ...data, version: { increment: 1 } } });
  }

  async deletePersonalRule(id: string) {
    const current = await this.prisma.personalRule.findUniqueOrThrow({ where: { id } });
    if (current.owner === "BUILT_IN") throw new Error("BUILT_IN_PROTECTED");
    await this.prisma.personalRule.delete({ where: { id } });
  }
}
