import { writable } from "svelte/store";
import type { AppState } from "../../types";

const stateStore = writable<AppState>({
  extensionIsActive: false,
  appVersion: "",
});

const saveActionInProgress = writable(false);
const appStateSyncInProgress = writable(false);

export default stateStore;
export { saveActionInProgress, appStateSyncInProgress };
