import { mkdir, open } from "node:fs/promises";
import { join } from "node:path";

export async function ensureRuntimePaths(root: string) {
  const databaseDirectory = join(root, "database");
  const databaseFile = join(databaseDirectory, "promptvault.db");
  const directories = [
    databaseDirectory,
    join(root, "storage", "images", "cover"),
    join(root, "storage", "images", "reference"),
    join(root, "storage", "images", "result"),
    join(root, "storage", "images", "comparison"),
    join(root, "backups"),
    join(root, "exports"),
  ];

  await Promise.all(directories.map((directory) => mkdir(directory, { recursive: true })));

  try {
    const handle = await open(databaseFile, "wx");
    await handle.close();
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) {
      throw error;
    }
  }

  return { databaseDirectory, databaseFile };
}
