import type { Prisma, PrismaClient } from "@prisma/client";
import type { CreatePromptInput, PromptListQuery, UpdatePromptInput } from "@promptvault/contracts";

const promptInclude = {
  modelTask: { include: { model: true } },
  category: true,
  tags: { include: { tag: true } },
  assets: true,
} satisfies Prisma.PromptInclude;

type Db = PrismaClient | Prisma.TransactionClient;

function toPromptDto(prompt: Prisma.PromptGetPayload<{ include: typeof promptInclude }>) {
  return {
    id: prompt.id,
    title: prompt.title,
    description: prompt.description,
    contentZh: prompt.contentZh,
    contentEn: prompt.contentEn,
    negativeZh: prompt.negativeZh,
    negativeEn: prompt.negativeEn,
    status: prompt.status,
    rating: prompt.rating,
    origin: prompt.origin,
    model: {
      id: prompt.modelTask.model.id,
      name: prompt.modelTask.model.name,
      provider: prompt.modelTask.model.provider,
      mediaType: prompt.modelTask.model.mediaType,
    },
    task: {
      id: prompt.modelTask.id,
      key: prompt.modelTask.stableKey,
      nameZh: prompt.modelTask.nameZh,
      nameEn: prompt.modelTask.nameEn,
    },
    category: prompt.category,
    tags: prompt.tags.map(({ tag }) => ({ id: tag.id, name: tag.name, type: tag.type })),
    assets: prompt.assets,
    createdAt: prompt.createdAt,
    updatedAt: prompt.updatedAt,
  };
}

export class PromptService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(query: PromptListQuery) {
    const keyword = query.keyword || undefined;
    const where: Prisma.PromptWhereInput = {
      ...(query.modelTaskId ? { modelTaskId: query.modelTaskId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.tag ? { tags: { some: { tag: { normalizedName: query.tag.toLowerCase() } } } } : {}),
      ...(keyword ? {
        OR: [
          { title: { contains: keyword } },
          { description: { contains: keyword } },
          { contentZh: { contains: keyword } },
          { contentEn: { contains: keyword } },
          { tags: { some: { tag: { name: { contains: keyword } } } } },
        ],
      } : {}),
    };

    const [total, prompts] = await Promise.all([
      this.prisma.prompt.count({ where }),
      this.prisma.prompt.findMany({
        where,
        include: promptInclude,
        orderBy: { updatedAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return { data: prompts.map(toPromptDto), total, page: query.page, limit: query.limit };
  }

  async get(id: string) {
    const prompt = await this.prisma.prompt.findUnique({ where: { id }, include: promptInclude });
    if (!prompt) throw new Error("PROMPT_NOT_FOUND");
    return toPromptDto(prompt);
  }

  async create(input: CreatePromptInput) {
    const created = await this.prisma.$transaction(async (tx) => {
      const prompt = await tx.prompt.create({
        data: {
          title: input.title,
          description: input.description,
          contentZh: input.contentZh,
          contentEn: input.contentEn,
          negativeZh: input.negativeZh,
          negativeEn: input.negativeEn,
          modelTaskId: input.modelTaskId,
          categoryId: input.categoryId,
          rating: input.rating,
          status: input.status,
          tags: { create: input.tagIds.map((tagId) => ({ tag: { connect: { id: tagId } } })) },
        },
        include: promptInclude,
      });
      await tx.promptVersion.create({
        data: { promptId: prompt.id, version: 1, snapshot: { contentZh: input.contentZh, contentEn: input.contentEn ?? null }, changeNote: "初始版本" },
      });
      return prompt;
    });
    return toPromptDto(created);
  }

  async update(id: string, input: UpdatePromptInput) {
    const existing = await this.prisma.prompt.findUnique({ where: { id } });
    if (!existing) throw new Error("PROMPT_NOT_FOUND");
    const { tagIds, changeNote, ...fields } = input;
    const updated = await this.prisma.$transaction(async (tx) => {
      const prompt = await tx.prompt.update({
        where: { id },
        data: {
          ...fields,
          ...(tagIds ? { tags: { deleteMany: {}, create: tagIds.map((tagId) => ({ tag: { connect: { id: tagId } } })) } } : {}),
        },
        include: promptInclude,
      });
      const latest = await tx.promptVersion.findFirst({ where: { promptId: id }, orderBy: { version: "desc" } });
      await tx.promptVersion.create({
        data: {
          promptId: id,
          version: (latest?.version ?? 0) + 1,
          snapshot: { contentZh: prompt.contentZh, contentEn: prompt.contentEn, negativeZh: prompt.negativeZh, negativeEn: prompt.negativeEn },
          changeNote: changeNote ?? "更新 Prompt",
        },
      });
      return prompt;
    });
    return toPromptDto(updated);
  }

  async remove(id: string) {
    await this.prisma.prompt.delete({ where: { id } });
  }

  async versions(id: string) {
    const prompt = await this.prisma.prompt.findUnique({ where: { id }, select: { id: true } });
    if (!prompt) throw new Error("PROMPT_NOT_FOUND");
    return this.prisma.promptVersion.findMany({ where: { promptId: id }, orderBy: { version: "desc" } });
  }
}
