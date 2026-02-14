import { Staging, type AppState, type AppStateMessage } from "../types";

const DEFAULT_APP_STATE: AppState = {
  extensionIsActive: false,
  appVersion: Staging,
};

type AppStateByTab = Record<number, AppState>;

function normalizeAppState(appState?: Partial<AppState>): AppState {
  return {
    ...DEFAULT_APP_STATE,
    ...(appState ?? {}),
  };
}

function createStateMessage(tabId?: number): Promise<AppStateMessage> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["appState", "appStateByTab"], (value) => {
      const appStateByTab = (value.appStateByTab ?? {}) as AppStateByTab;
      const tabState =
        typeof tabId === "number" ? appStateByTab[tabId] : undefined;
      const hasAnyTabState = Object.keys(appStateByTab).length > 0;
      // Legacy fallback is used only before first tab-scoped state is persisted.
      const appState =
        tabState ?? (!hasAnyTabState ? value.appState : DEFAULT_APP_STATE);
      resolve({ name: "app-state", payload: normalizeAppState(appState) });
    });
  });
}

function saveAppState(tabId: number | undefined, appState: AppState) {
  const normalizedAppState = normalizeAppState(appState);

  if (typeof tabId !== "number") {
    chrome.storage.local.set({ appState: normalizedAppState });
    return;
  }

  chrome.storage.local.get("appStateByTab", (value) => {
    const appStateByTab = (value.appStateByTab ?? {}) as AppStateByTab;
    chrome.storage.local.set({
      appStateByTab: {
        ...appStateByTab,
        [tabId]: normalizedAppState,
      },
    });
  });
}

export { createStateMessage, saveAppState };
