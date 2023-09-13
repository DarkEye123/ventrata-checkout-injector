import type { StateMessage } from "../types";

let appState: StateMessage["payload"] = {
  appVersion: "staging",
  isActive: true,
};

chrome.storage.local.get("appState", (value) => {
  if (value.appState) {
    appState = value.appState as typeof appState;
  }
});

function createStateMessage(): StateMessage {
  return { name: "app-state", payload: appState };
}

function updateAppState(newState: typeof appState) {
  appState = { ...newState };
}

export { updateAppState, createStateMessage, appState };
