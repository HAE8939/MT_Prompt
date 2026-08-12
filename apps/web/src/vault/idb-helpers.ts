import { normalizeVaultError } from "./errors";

export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), {
      once: true,
    });
    request.addEventListener(
      "error",
      () =>
        reject(
          normalizeVaultError(
            "REQUEST_FAILED",
            "The Vault request failed.",
            request.error,
          ),
        ),
      { once: true },
    );
  });
}

export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });

    const rejectTransaction = () =>
      reject(
        normalizeVaultError(
          "TRANSACTION_FAILED",
          "The Vault transaction failed.",
          transaction.error,
        ),
      );

    transaction.addEventListener("abort", rejectTransaction, { once: true });
    transaction.addEventListener("error", rejectTransaction, { once: true });
  });
}
