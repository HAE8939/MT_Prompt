import { ensureRuntimePaths } from "./ensure-runtime-paths.js";

async function main() {
  await ensureRuntimePaths(process.cwd());
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
