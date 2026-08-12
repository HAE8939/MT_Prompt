import { transactionDone } from "./idb-helpers";
import { openVault } from "./open-vault";
import type { VaultTransaction } from "./repository-types";

export function createVaultTransaction(): VaultTransaction {
  return {
    async importBundle(bundle) {
      const db = await openVault();
      const tx = db.transaction(["prompts", "assets", "versions", "knowledge", "settings", "meta"], "readwrite");
      for (const record of bundle.prompts) tx.objectStore("prompts").add(record);
      for (const record of bundle.assets) tx.objectStore("assets").add(record);
      for (const record of bundle.versions) tx.objectStore("versions").add(record);
      for (const record of bundle.knowledge) tx.objectStore("knowledge").add(record);
      if (bundle.interfaceSettings) tx.objectStore("settings").put({ key: "interface", value: bundle.interfaceSettings });
      for (const record of bundle.meta) tx.objectStore("meta").put(record);
      await transactionDone(tx);
    },
  };
}
