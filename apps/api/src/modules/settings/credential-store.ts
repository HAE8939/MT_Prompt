export interface CredentialStore {
  set(service: string, secret: string): Promise<void>;
  get(service: string): Promise<string | null>;
  remove(service: string): Promise<void>;
}
