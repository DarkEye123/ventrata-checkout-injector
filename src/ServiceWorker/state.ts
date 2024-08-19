import type { AppStateMessage } from "../types";

function createStateMessage(): Promise<AppStateMessage> {
  return new Promise((resolve) => {
    chrome.storage.local.get("appState", (value) => {
      resolve({ name: "app-state", payload: value.appState });
    });
  });
}

function saveAppState(appState: AppStateMessage["payload"]) {
  chrome.storage.local.set({ appState });
}

export { createStateMessage, saveAppState };
