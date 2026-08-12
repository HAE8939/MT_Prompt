import type { PromptRecord } from "../domain/types";
import { BUILT_IN_KNOWLEDGE } from "./built-in-knowledge";
import { requestResult, transactionDone } from "./idb-helpers";
import { EXAMPLE_PROMPTS } from "./example-prompts";
import { openVault } from "./open-vault";

const EXAMPLE_SET_KEY = "exampleSetVersion";
const EXAMPLE_SET_VERSION = 1;
const KNOWLEDGE_SET_KEY = "knowledgeSetVersion";
const KNOWLEDGE_SET_VERSION = 1;

export async function initializeVault(): Promise<void> {
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
    if (!knowledgeInitialized) {
      for (const record of BUILT_IN_KNOWLEDGE) {
        knowledge.add(record);
      }
      meta.put({ key: KNOWLEDGE_SET_KEY, value: KNOWLEDGE_SET_VERSION });
    }

    await done;
  } catch (error) {
    transaction.abort();
    await done.catch(() => undefined);
    throw error;
  }
}
