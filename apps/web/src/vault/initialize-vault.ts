import type { KnowledgeRecord, PromptAsset, PromptRecord } from "../domain/types";
import { BUILT_IN_KNOWLEDGE } from "./built-in-knowledge";
import { requestResult, transactionDone } from "./idb-helpers";
import { EXAMPLE_PROMPTS } from "./example-prompts";
import { openVault } from "./open-vault";
import { blobBytes } from "../transfer/hash";

const EXAMPLE_SET_KEY = "exampleSetVersion";
const EXAMPLE_SET_VERSION = 1;
const KNOWLEDGE_SET_KEY = "knowledgeSetVersion";
const KNOWLEDGE_SET_VERSION = 2;
const ASSET_SET_KEY = "exampleAssetSetVersion";
const ASSET_SET_VERSION = 1;

type InitializeOptions = { loadAsset?: (path: string) => Promise<Blob> };

async function checksum(blob: Blob): Promise<string> {
  const bytes = await blobBytes(blob);
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function fetchAsset(path: string): Promise<Blob> {
  const response = await fetch(`/builtin-prompts/${path}`);
  if (!response.ok) throw new Error(`Unable to load built-in media ${path}.`);
  return response.blob();
}

export async function initializeVault(options: InitializeOptions = {}): Promise<void> {
  const database = await openVault();
  const transaction = database.transaction(["prompts", "knowledge", "meta"], "readwrite");
  const done = transactionDone(transaction);
  const prompts = transaction.objectStore("prompts");
  const knowledge = transaction.objectStore("knowledge");
  const meta = transaction.objectStore("meta");

  try {
    const initialized = await requestResult<{ key: string; value: number } | undefined>(
      meta.get(EXAMPLE_SET_KEY),
    );

    if (!initialized) {
      for (const example of EXAMPLE_PROMPTS) {
        const existing = await requestResult<PromptRecord | undefined>(
          prompts.get(example.id),
        );
        if (!existing) {
          prompts.add(example);
        }
      }
      meta.put({ key: EXAMPLE_SET_KEY, value: EXAMPLE_SET_VERSION });
    }

    const knowledgeInitialized = await requestResult<
      { key: string; value: number } | undefined
    >(meta.get(KNOWLEDGE_SET_KEY));
    if (!knowledgeInitialized || knowledgeInitialized.value < KNOWLEDGE_SET_VERSION) {
      for (const record of BUILT_IN_KNOWLEDGE) {
        const existing = await requestResult<KnowledgeRecord | undefined>(knowledge.index("stableKey").get(record.stableKey));
        if (!existing) knowledge.add(record);
      }
      meta.put({ key: KNOWLEDGE_SET_KEY, value: KNOWLEDGE_SET_VERSION });
    }

    await done;
  } catch (error) {
    transaction.abort();
    await done.catch(() => undefined);
    throw error;
  }

  const metaTransaction = database.transaction("meta", "readonly");
  const assetsInitialized = await requestResult<{ key: string; value: number } | undefined>(metaTransaction.objectStore("meta").get(ASSET_SET_KEY));
  await transactionDone(metaTransaction);
  if (assetsInitialized) return;

  try {
    const loader = options.loadAsset ?? fetchAsset;
    const seedAssets: Array<{ promptId: string; role: PromptAsset["role"]; name: string }> = [
      ...Array.from({ length: 10 }, (_, index) => ({ promptId: `builtin-prompt-${String(index + 1).padStart(2, "0")}`, role: "COVER" as const, name: `${String(index + 1).padStart(2, "0")}.webp` })),
      { promptId: "builtin-prompt-01", role: "REFERENCE", name: "01_before.webp" },
    ];
    const prepared: PromptAsset[] = [];
    for (const seed of seedAssets) {
      const blob = await loader(seed.name);
      prepared.push({ id: `builtin-asset-${seed.promptId}-${seed.role.toLowerCase()}`, promptId: seed.promptId, role: seed.role, blob, mimeType: "image/webp", originalName: seed.name, byteSize: blob.size, checksum: await checksum(blob), createdAt: "2026-08-12T00:00:00.000Z" });
    }
    const assetTransaction = database.transaction(["assets", "meta"], "readwrite");
    const assetStore = assetTransaction.objectStore("assets");
    const existingAssets = await requestResult<PromptAsset[]>(assetStore.getAll());
    const existingIds = new Set(existingAssets.map(({ id }) => id));
    for (const asset of prepared) if (!existingIds.has(asset.id)) assetStore.add(asset);
    assetTransaction.objectStore("meta").put({ key: ASSET_SET_KEY, value: ASSET_SET_VERSION });
    await transactionDone(assetTransaction);
  } catch {
    // A missing static asset must not prevent the text-only Vault from opening.
  }
}
