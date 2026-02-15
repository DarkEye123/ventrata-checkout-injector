import { cleanupLegacyDynamicRules } from "../helpers";
import { cleanupLegacyAppStateStorage } from "../state";
import type { ServiceWorkerMigration } from "./types";

const migration_1_0_2: ServiceWorkerMigration = {
  id: "1.0.2",
  run: async () => {
    await cleanupLegacyDynamicRules();
    await cleanupLegacyAppStateStorage();
  },
};

export { migration_1_0_2 };
