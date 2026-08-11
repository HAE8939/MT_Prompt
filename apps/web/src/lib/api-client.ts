export type PromptRecord = {
  id: string; title: string; description: string | null; contentZh: string; contentEn: string | null;
  negativeZh?: string | null; negativeEn?: string | null; status: "EXPERIMENT" | "VERIFIED" | "FAVORITE";
  rating: number; origin: "MANUAL" | "GENERATED";
  model: { id: string; name: string; provider: string; mediaType: "IMAGE" | "VIDEO" };
  task: { id: string; key: string; nameZh: string; nameEn: string };
  category: { id: string; name: string } | null;
  tags: Array<{ id: string; name: string; type: string | null }>;
  assets: Array<{ id: string; role: "COVER" | "REFERENCE" | "RESULT" | "COMPARISON"; storageKey: string; mimeType: string; originalName?: string; byteSize?: number }>;
  provenance?: { compilationRunId: string; templateKey: string; templateVersion: number; compilerVersion: string; translationProvider: string | null; translationStatus: string; translationError: string | null; skills: Array<{ stableKey: string; version: number }>; createdAt: string } | null;
  createdAt: string; updatedAt: string;
};

export type PromptListResponse = { data: PromptRecord[]; total: number; page: number; limit: number };

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const hasJsonBody = init?.body !== undefined && !(init.body instanceof FormData);
  const response = await fetch(`/api/v1${path}`, { ...init, headers: { ...(hasJsonBody ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `请求失败 (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
