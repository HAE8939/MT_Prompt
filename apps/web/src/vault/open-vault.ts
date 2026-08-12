import { normalizeVaultError } from "./errors";
import { requestResult } from "./idb-helpers";
import { upgradeVault, VAULT_NAME, VAULT_VERSION } from "./schema";

let connectionPromise: Promise<IDBDatabase> | undefined;

export function openVault(): Promise<IDBDatabase> {
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(VAULT_NAME, VAULT_VERSION);

    request.addEventListener("upgradeneeded", (event) => {
      if ((event as IDBVersionChangeEvent).oldVersion === 0) {
        upgradeVault(request.result);
      }
    });
    request.addEventListener("success", () => {
      const database = request.result;
      database.addEventListener(
        "versionchange",
        () => {
          database.close();
          connectionPromise = undefined;
        },
        { once: true },
      );
      resolve(database);
    });
    request.addEventListener("error", () => {
      connectionPromise = undefined;
      reject(
        normalizeVaultError(
          "OPEN_FAILED",
          "Unable to open the browser Vault.",
          request.error,
        ),
      );
    });
    request.addEventListener("blocked", () => {
      connectionPromise = undefined;
      reject(
        normalizeVaultError(
          "OPEN_FAILED",
          "Opening the browser Vault was blocked by another connection.",
          request.error,
        ),
      );
    });
  });

  return connectionPromise;
}

export async function deleteVault(): Promise<void> {
  const connection = connectionPromise
    ? await connectionPromise.catch(() => undefined)
    : undefined;
  connection?.close();
  connectionPromise = undefined;

  try {
    await requestResult(indexedDB.deleteDatabase(VAULT_NAME));
  } catch (error) {
    throw normalizeVaultError(
      "DELETE_FAILED",
      "Unable to delete the browser Vault.",
      error,
    );
  }
}
