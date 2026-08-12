import type { InterfaceSettings, ProviderSettings } from "../domain/types";
import { requestResult, transactionDone } from "./idb-helpers";
import { openVault } from "./open-vault";
import type { SettingsRepository } from "./repository-types";

const defaults: InterfaceSettings = { theme: "system", language: "zh-CN", libraryView: "list", compact: true };

async function readSetting<T>(key: string): Promise<T | undefined> {
  const db = await openVault(); const tx = db.transaction("settings", "readonly");
  const record = await requestResult<{ key: string; value: T } | undefined>(tx.objectStore("settings").get(key));
  await transactionDone(tx); return record?.value;
}

async function writeSetting(key: string, value: unknown): Promise<void> {
  const db = await openVault(); const tx = db.transaction("settings", "readwrite");
  tx.objectStore("settings").put({ key, value }); await transactionDone(tx);
}

export function createSettingsRepository(): SettingsRepository {
  const getInterface = async () => (await readSetting<InterfaceSettings>("interface")) ?? defaults;
  return {
    getProvider: () => readSetting<ProviderSettings>("provider"),
    saveProvider: (settings) => writeSetting("provider", settings),
    async clearProvider() { const db = await openVault(); const tx = db.transaction("settings", "readwrite"); tx.objectStore("settings").delete("provider"); await transactionDone(tx); },
    getInterface,
    saveInterface: (settings) => writeSetting("interface", settings),
    async getPortableInterface() { return { ...(await getInterface()) }; },
  };
}
