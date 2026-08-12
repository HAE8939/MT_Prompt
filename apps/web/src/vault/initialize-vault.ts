import type { PromptRecord } from "../domain/types";
import { requestResult, transactionDone } from "./idb-helpers";
import { EXAMPLE_PROMPTS } from "./example-prompts";
import { openVault } from "./open-vault";

const EXAMPLE_SET_KEY = "exampleSetVersion";
const EXAMPLE_SET_VERSION = 1;

export async function initializeVault(): Promise<void> {
  const database = await openVault();
  const transaction = database.transaction(["prompts", "meta"], "readwrite");
  const done = transactionDone(transaction);
  const prompts = transaction.objectStore("prompts");
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

    await done;
  } catch (error) {
    transaction.abort();
    await done.catch(() => undefined);
    throw error;
  }
}
