import { createEventDispatcher } from "svelte";

type AppStateEvents = { requestAppStateSync: null; appStateSyncReady: null };

function useAppStateSync() {
  const dispatch = createEventDispatcher<AppStateEvents>();

  return {
    requestAppStateSync: () => dispatch("requestAppStateSync"),
    appStateSyncReady: () => dispatch("appStateSyncReady"),
  };
}

export { useAppStateSync, type AppStateEvents };
