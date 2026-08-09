export type PromptRecord = {
  id: string; title: string; description: string | null; contentZh: string; contentEn: string | null;
  negativeZh?: string | null; negativeEn?: string | null; status: "EXPERIMENT" | "VERIFIED" | "FAVORITE";
  rating: number; origin: "MANUAL" | "GENERATED";
  model: { id: string; name: string; provider: string; mediaType: "IMAGE" | "VIDEO" };
  task: { id: string; key: string; nameZh: string; nameEn: string };
  category: { id: string; name: string } | null;
  tags: Array<{ id: string; name: string; type: string | null }>;
  assets: Array<{ id: string; role: string; storageKey: string; mimeType: string }>;
  createdAt: string; updatedAt: string;
};

export type PromptListResponse = { data: PromptRecord[]; total: number; page: number; limit: number };

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `请求失败 (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
