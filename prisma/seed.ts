import { PrismaClient } from "@prisma/client";
import { defaultSectionOrder, models, skills } from "./seed-data.js";

const prisma = new PrismaClient();

async function seedModels() {
  for (const [modelOrder, modelData] of models.entries()) {
    const model = await prisma.model.upsert({
      where: { stableKey: modelData.key },
      update: { name: modelData.name, provider: modelData.provider, mediaType: modelData.mediaType, description: modelData.description, order: modelOrder },
      create: { stableKey: modelData.key, name: modelData.name, provider: modelData.provider, mediaType: modelData.mediaType, description: modelData.description, order: modelOrder },
    });

    for (const [taskOrder, taskData] of modelData.tasks.entries()) {
      const modelTask = await prisma.modelTask.upsert({
        where: { stableKey: taskData.key },
        update: { modelId: model.id, nameZh: taskData.nameZh, nameEn: taskData.nameEn, capabilities: taskData.capabilities, sectionOrder: defaultSectionOrder, order: taskOrder },
        create: { stableKey: taskData.key, modelId: model.id, nameZh: taskData.nameZh, nameEn: taskData.nameEn, capabilities: taskData.capabilities, sectionOrder: defaultSectionOrder, order: taskOrder },
      });

      await prisma.promptTemplate.upsert({
        where: { stableKey: taskData.template.key },
        update: { modelTaskId: modelTask.id, nameZh: taskData.template.nameZh, nameEn: taskData.template.nameEn, templateZh: taskData.template.templateZh, templateEn: taskData.template.templateEn, fieldSchema: taskData.template.fieldSchema },
        create: { stableKey: taskData.template.key, modelTaskId: modelTask.id, nameZh: taskData.template.nameZh, nameEn: taskData.template.nameEn, templateZh: taskData.template.templateZh, templateEn: taskData.template.templateEn, fieldSchema: taskData.template.fieldSchema },
      });
    }
  }
}

async function seedSkills() {
  for (const skillData of skills) {
    const promptSkill = await prisma.promptSkill.upsert({
      where: { stableKey: skillData.key },
      update: {
        nameZh: skillData.nameZh, nameEn: skillData.nameEn,
        descriptionZh: skillData.descriptionZh, descriptionEn: skillData.descriptionEn,
        contentZh: skillData.contentZh, contentEn: skillData.contentEn,
        category: skillData.category, priority: skillData.priority, conflictGroup: skillData.conflictGroup,
      },
      create: {
        stableKey: skillData.key, nameZh: skillData.nameZh, nameEn: skillData.nameEn,
        descriptionZh: skillData.descriptionZh, descriptionEn: skillData.descriptionEn,
        contentZh: skillData.contentZh, contentEn: skillData.contentEn,
        category: skillData.category, priority: skillData.priority, conflictGroup: skillData.conflictGroup,
      },
    });

    const modelTasks = await prisma.modelTask.findMany({
      where: { model: { stableKey: { in: skillData.modelKeys } } },
      select: { id: true },
    });

    await prisma.skillModelTask.deleteMany({ where: { skillId: promptSkill.id } });
    if (modelTasks.length > 0) {
      await prisma.skillModelTask.createMany({
        data: modelTasks.map(({ id }) => ({ skillId: promptSkill.id, modelTaskId: id })),
      });
    }
  }
}

async function main() {
  await seedModels();
  await seedSkills();
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
