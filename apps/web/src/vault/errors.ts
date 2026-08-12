export type VaultErrorCode =
  | "REQUEST_FAILED"
  | "TRANSACTION_FAILED"
  | "OPEN_FAILED"
  | "DELETE_FAILED";

export class VaultError extends Error {
  readonly code: VaultErrorCode;
  override readonly cause?: unknown;

  constructor(code: VaultErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "VaultError";
    this.code = code;
    this.cause = cause;
  }
}

export function normalizeVaultError(
  code: VaultErrorCode,
  message: string,
  error: unknown,
): VaultError {
  return error instanceof VaultError
    ? error
    : new VaultError(code, message, error);
}
