import type { Prisma, PrismaClient } from "@prisma/client";
import type { AiProposalSaveInput, BulkPromptUpdateInput, CreatePromptInput, PromptListQuery, UpdatePromptInput } from "@promptvault/contracts";

const promptInclude = {
  modelTask: { include: { model: true } },
  category: true,
  tags: { include: { tag: true } },
  assets: true,
  compilationRun: { include: { skills: true } },
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
    provenance: prompt.compilationRun ? {
      compilationRunId: prompt.compilationRun.id,
      templateKey: prompt.compilationRun.templateKey,
      templateVersion: prompt.compilationRun.templateVersion,
      compilerVersion: prompt.compilationRun.compilerVersion,
      translationProvider: prompt.compilationRun.translationProvider,
      translationStatus: prompt.compilationRun.translationStatus,
      translationError: prompt.compilationRun.translationError,
      skills: prompt.compilationRun.skills.map((skill) => ({ stableKey: skill.stableKey, version: skill.version })),
      createdAt: prompt.compilationRun.createdAt,
    } : null,
    createdAt: prompt.createdAt,
    updatedAt: prompt.updatedAt,
  };
}

export class PromptService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(query: PromptListQuery) {
    const keyword = query.keyword || undefined;
    const where: Prisma.PromptWhereInput = {
      deletedAt: null,
      ...(query.modelTaskId ? { modelTaskId: query.modelTaskId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.tag ? { tags: { some: { tag: { normalizedName: query.tag.toLowerCase() } } } } : {}),
      ...(query.mediaType ? { modelTask: { model: { mediaType: query.mediaType } } } : {}),
      ...(query.origin ? { origin: query.origin } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.hasEnglish !== undefined ? { contentEn: query.hasEnglish ? { not: null } : null } : {}),
      ...(query.hasAsset !== undefined ? { assets: query.hasAsset ? { some: {} } : { none: {} } } : {}),
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
        orderBy: { [query.sort]: query.order },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return { data: prompts.map(toPromptDto), total, page: query.page, limit: query.limit };
  }

  async get(id: string) {
    const prompt = await this.prisma.prompt.findFirst({ where: { id, deletedAt: null }, include: promptInclude });
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
    const existing = await this.prisma.prompt.findFirst({ where: { id, deletedAt: null } });
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

  async saveAiProposal(id: string, input: AiProposalSaveInput) {
    return this.update(id, { contentZh: input.contentZh, contentEn: input.contentEn ?? undefined, changeNote: input.changeNote });
  }

  async remove(id: string) {
    const result = await this.prisma.prompt.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date() } });
    if (!result.count) throw new Error("PROMPT_NOT_FOUND");
  }

  async restore(id: string) {
    const result = await this.prisma.prompt.updateMany({ where: { id, deletedAt: { not: null } }, data: { deletedAt: null } });
    if (!result.count) throw new Error("PROMPT_NOT_FOUND");
    return this.get(id);
  }

  async bulkUpdate(input: BulkPromptUpdateInput) {
    const data = Object.fromEntries(Object.entries({ status: input.status, categoryId: input.categoryId }).filter(([, value]) => value !== undefined));
    if (!Object.keys(data).length) return { updated: 0 };
    const result = await this.prisma.$transaction(async (tx) => tx.prompt.updateMany({ where: { id: { in: input.ids }, deletedAt: null }, data }));
    return { updated: result.count };
  }

  async duplicates() {
    const prompts = await this.prisma.prompt.findMany({ where: { deletedAt: null }, select: { id: true, contentZh: true, contentEn: true, title: true } });
    const groups = new Map<string, { ids: string[]; titles: string[] }>();
    for (const prompt of prompts) {
      const key = `${normalize(prompt.contentZh)}\u0000${normalize(prompt.contentEn ?? "")}`;
      const group = groups.get(key) ?? { ids: [], titles: [] };
      group.ids.push(prompt.id); group.titles.push(prompt.title); groups.set(key, group);
    }
    return [...groups.values()].filter((group) => group.ids.length > 1);
  }

  async versions(id: string) {
    const prompt = await this.prisma.prompt.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!prompt) throw new Error("PROMPT_NOT_FOUND");
    return this.prisma.promptVersion.findMany({ where: { promptId: id }, orderBy: { version: "desc" } });
  }

  async versionDiff(promptId: string, fromId: string, toId: string) {
    const versions = await this.prisma.promptVersion.findMany({ where: { promptId, id: { in: [fromId, toId] } } });
    if (versions.length !== 2) throw new Error("PROMPT_VERSION_NOT_FOUND");
    const from = versions.find((version) => version.id === fromId)!;
    const to = versions.find((version) => version.id === toId)!;
    const fields = new Set([...Object.keys(from.snapshot as object), ...Object.keys(to.snapshot as object)]);
    return [...fields].sort().map((field) => ({ field, before: (from.snapshot as Record<string, unknown>)[field] ?? null, after: (to.snapshot as Record<string, unknown>)[field] ?? null, changed: JSON.stringify((from.snapshot as Record<string, unknown>)[field] ?? null) !== JSON.stringify((to.snapshot as Record<string, unknown>)[field] ?? null) }));
  }

  async restoreVersion(promptId: string, versionId: string) {
    const activePrompt = await this.prisma.prompt.findFirst({ where: { id: promptId, deletedAt: null }, select: { id: true } });
    if (!activePrompt) throw new Error("PROMPT_NOT_FOUND");
    const version = await this.prisma.promptVersion.findFirst({ where: { id: versionId, promptId } });
    if (!version) throw new Error("PROMPT_VERSION_NOT_FOUND");
    const snapshot = version.snapshot as Record<string, unknown>;
    const fields = Object.fromEntries(["title", "description", "contentZh", "contentEn", "negativeZh", "negativeEn"].filter((key) => typeof snapshot[key] === "string" || snapshot[key] === null).map((key) => [key, snapshot[key]]));
    return this.prisma.$transaction(async (tx) => {
      const restored = await tx.prompt.update({ where: { id: promptId }, data: fields, include: promptInclude });
      const latest = await tx.promptVersion.findFirst({ where: { promptId }, orderBy: { version: "desc" } });
      await tx.promptVersion.create({ data: { promptId, version: (latest?.version ?? 0) + 1, snapshot: { title: restored.title, description: restored.description, contentZh: restored.contentZh, contentEn: restored.contentEn, negativeZh: restored.negativeZh, negativeEn: restored.negativeEn }, changeNote: `恢复自 v${version.version}` } });
      return toPromptDto(restored);
    });
  }

  async recycleBin() {
    return this.prisma.prompt.findMany({ where: { deletedAt: { not: null } }, include: promptInclude, orderBy: { deletedAt: "desc" } });
  }
}

function normalize(value: string) { return value.trim().toLocaleLowerCase().replace(/\s+/g, " "); }
