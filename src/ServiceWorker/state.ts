import type { StateMessage } from "../types";

let appState: StateMessage["payload"] = {
  appVersion: "staging",
  isActive: true,
};

function createStateMessage(): StateMessage {
  return { name: "app-state", payload: appState };
}

function updateAppState(newState: typeof appState) {
  appState = { ...newState };
}

export { updateAppState, createStateMessage, appState };
