import { migration_1_0_2 } from "./migration-1.0.2";
import type { ServiceWorkerMigration } from "./types";

const APPLIED_MIGRATIONS_STORAGE_KEY = "appliedServiceWorkerMigrations";

const migrations: ServiceWorkerMigration[] = [migration_1_0_2];

function readAppliedMigrations(): Promise<string[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(APPLIED_MIGRATIONS_STORAGE_KEY, (value) => {
      const appliedMigrations = value[APPLIED_MIGRATIONS_STORAGE_KEY];
      resolve(Array.isArray(appliedMigrations) ? appliedMigrations : []);
    });
  });
}

function saveAppliedMigrations(appliedMigrationIds: string[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(
      { [APPLIED_MIGRATIONS_STORAGE_KEY]: appliedMigrationIds },
      () => resolve(),
    );
  });
}

async function runMigrations() {
  const appliedMigrations = new Set(await readAppliedMigrations());

  for (const migration of migrations) {
    if (appliedMigrations.has(migration.id)) {
      continue;
    }

    console.log(`Service Worker::running migration ${migration.id}`);
    await migration.run();
    appliedMigrations.add(migration.id);
    await saveAppliedMigrations(Array.from(appliedMigrations));
  }
}

export { runMigrations };
