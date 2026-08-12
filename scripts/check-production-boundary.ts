import { readFile } from "node:fs/promises";
import { join } from "node:path";

const USER_DATA_PATHS = ["database", "storage", "data", "exports", "backups", "prisma"];

export async function inspectProductionBoundary(projectRoot: string) {
  const [dockerfile, compose] = await Promise.all([
    readFile(join(projectRoot, "Dockerfile"), "utf8"),
    readFile(join(projectRoot, "docker-compose.yml"), "utf8"),
  ]);
  const runtime = dockerfile.split(/^FROM\s+/m).at(-1) ?? "";
  const copyLines = runtime.split(/\r?\n/).filter((line) => /^COPY\s/i.test(line));
  const copiedUserDataPaths = USER_DATA_PATHS.filter((path) => copyLines.some((line) => new RegExp(`(?:^|[\\s/])${path}(?:[\\s/]|$)`, "i").test(line)));
  const persistentVolumes = compose.split(/\r?\n/).filter((line) => /^\s+volumes:\s*$/i.test(line)).map((line) => line.trim());
  const install = runtime.match(/npm install[^\r\n]*?\s((?:@?[^\s]+\s*)+)$/m)?.[1] ?? "";
  const runtimePackages = install.trim().split(/\s+/).filter((value) => value.includes("@") && !value.startsWith("--"));
  return { copiedUserDataPaths, persistentVolumes, runtimePackages };
}
