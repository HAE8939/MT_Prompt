import type { KnowledgeRecord, PromptAsset, PromptRecord } from "../domain/types";
import { BUILT_IN_KNOWLEDGE } from "./built-in-knowledge";
import { requestResult, transactionDone } from "./idb-helpers";
import { EXAMPLE_PROMPTS } from "./example-prompts";
import { openVault } from "./open-vault";
import { blobBytes, sha256 } from "../transfer/hash";

const EXAMPLE_SET_KEY = "exampleSetVersion";
const EXAMPLE_SET_VERSION = 2;
const KNOWLEDGE_SET_KEY = "knowledgeSetVersion";
const KNOWLEDGE_SET_VERSION = 3;
const ASSET_SET_KEY = "exampleAssetSetVersion";
const ASSET_SET_VERSION = 2;

type InitializeOptions = { loadAsset?: (path: string) => Promise<Blob> };

async function checksum(blob: Blob): Promise<string> {
  return sha256(await blobBytes(blob));
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

    if (!initialized || initialized.value < EXAMPLE_SET_VERSION) {
      for (const example of EXAMPLE_PROMPTS) {
        const existing = await requestResult<PromptRecord | undefined>(
          prompts.get(example.id),
        );
        if (!existing) {
          prompts.add(example);
        } else if (existing.origin === "BUILT_IN") {
          prompts.put({ ...existing, contentZh: example.contentZh });
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
        if (!existing) {
          knowledge.add(record);
        } else if (existing.owner === "BUILT_IN") {
          knowledge.put({ ...record, id: existing.id, enabled: existing.enabled });
        }
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
  const assetSetVersion = assetsInitialized?.value ?? 0;
  try {
    const seedAssets: Array<{ promptId: string; role: PromptAsset["role"]; name: string }> = [
      ...Array.from({ length: 10 }, (_, index) => ({ promptId: `builtin-prompt-${String(index + 1).padStart(2, "0")}`, role: "COVER" as const, name: `${String(index + 1).padStart(2, "0")}.webp` })),
      { promptId: "builtin-prompt-01", role: "REFERENCE", name: "01_before.webp" },
    ];

    const existingTransaction = database.transaction("assets", "readonly");
    const existingAssets = await requestResult<PromptAsset[]>(existingTransaction.objectStore("assets").getAll());
    await transactionDone(existingTransaction);
    const existingIds = new Set(existingAssets.map(({ id }) => id));
    const missingSeeds = seedAssets.filter(({ promptId, role }) => !existingIds.has(`builtin-asset-${promptId}-${role.toLowerCase()}`));

    if (missingSeeds.length === 0 && assetSetVersion >= ASSET_SET_VERSION) return;

    const loader = options.loadAsset ?? fetchAsset;
    const prepared: PromptAsset[] = [];
    for (const seed of missingSeeds) {
      const blob = await loader(seed.name);
      prepared.push({ id: `builtin-asset-${seed.promptId}-${seed.role.toLowerCase()}`, promptId: seed.promptId, role: seed.role, blob, mimeType: "image/webp", originalName: seed.name, byteSize: blob.size, checksum: await checksum(blob), createdAt: "2026-08-12T00:00:00.000Z" });
    }
    const assetTransaction = database.transaction(["assets", "meta"], "readwrite");
    const assetStore = assetTransaction.objectStore("assets");
    for (const asset of prepared) if (!existingIds.has(asset.id)) assetStore.add(asset);
    assetTransaction.objectStore("meta").put({ key: ASSET_SET_KEY, value: ASSET_SET_VERSION });
    await transactionDone(assetTransaction);
  } catch {
    // A missing static asset must not prevent the text-only Vault from opening.
  }
}
