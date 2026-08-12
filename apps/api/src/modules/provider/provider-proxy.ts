import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class ProviderProxyError extends Error { constructor(public readonly code: "PROVIDER_REJECTED" | "PROVIDER_TIMEOUT" | "PROVIDER_UNAVAILABLE", message: string) { super(message); this.name = "ProviderProxyError"; } }
export type ResolveHostname = (hostname: string) => Promise<string[]>;
const defaultResolve: ResolveHostname = async (hostname) => (await lookup(hostname, { all: true })).map(({ address }) => address);

function unsafeIpv4(address: string) { const parts = address.split(".").map(Number); const [a, b] = parts; return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b! >= 16 && b! <= 31) || (a === 192 && b === 168) || a! >= 224; }
function unsafeIp(address: string) { if (isIP(address) === 4) return unsafeIpv4(address); const value = address.toLowerCase(); return value === "::" || value === "::1" || value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb") || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("ff") || value.startsWith("::ffff:") && unsafeIpv4(value.slice(7)); }

export async function assertSafeProviderUrl(value: string, resolveHostname: ResolveHostname = defaultResolve): Promise<URL> {
  let url: URL; try { url = new URL(value); } catch { throw new ProviderProxyError("PROVIDER_REJECTED", "Invalid Provider URL."); }
  if (url.protocol !== "https:" || url.username || url.password || ["localhost", "localhost.localdomain"].includes(url.hostname.toLowerCase())) throw new ProviderProxyError("PROVIDER_REJECTED", "Unsafe Provider URL.");
  const addresses = isIP(url.hostname) ? [url.hostname] : await resolveHostname(url.hostname).catch(() => []);
  if (!addresses.length || addresses.some(unsafeIp)) throw new ProviderProxyError("PROVIDER_REJECTED", "Provider resolves to an unsafe address.");
  return url;
}

export function providerEndpoint(baseUrl: URL) { return `${baseUrl.toString().replace(/\/$/, "")}/chat/completions`; }
