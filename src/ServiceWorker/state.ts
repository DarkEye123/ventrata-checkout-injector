import { Staging, type AppState, type AppStateMessage } from "../types";

const DEFAULT_APP_STATE: AppState = {
  extensionIsActive: false,
  appVersion: Staging,
};

const GLOBAL_APP_STATE_KEY = "globalAppState";
const LEGACY_GLOBAL_APP_STATE_KEY = "appState";
const LEGACY_TAB_APP_STATE_KEY = "appStateByTab";
const TAB_APP_STATE_KEY_PREFIX = "tabAppState:";

type TabScopedAppState = Pick<AppState, "extensionIsActive" | "appVersion">;

function normalizeAppState(appState?: Partial<AppState>): AppState {
  return {
    ...DEFAULT_APP_STATE,
    ...(appState ?? {}),
  };
}

function getTabAppStateKey(tabId: number) {
  return `${TAB_APP_STATE_KEY_PREFIX}${tabId}`;
}

function readGlobalAppState(): Promise<Partial<AppState>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      [GLOBAL_APP_STATE_KEY, LEGACY_GLOBAL_APP_STATE_KEY],
      (value) => {
        const globalAppState = (value[GLOBAL_APP_STATE_KEY] ?? {}) as Partial<
          AppState
        >;
        const legacyAppState = (
          value[LEGACY_GLOBAL_APP_STATE_KEY] ?? {}
        ) as Partial<AppState>;
        resolve({
          ghAccessToken: globalAppState.ghAccessToken ?? legacyAppState.ghAccessToken,
        });
      },
    );
  });
}

function readTabAppState(tabId: number): Promise<Partial<AppState>> {
  return new Promise((resolve) => {
    chrome.storage.session.get(getTabAppStateKey(tabId), (value) => {
      const tabState = value[getTabAppStateKey(tabId)] as
        | TabScopedAppState
        | undefined;
      resolve(tabState ?? {});
    });
  });
}

async function createStateMessage(tabId?: number): Promise<AppStateMessage> {
  const globalAppState = await readGlobalAppState();
  if (typeof tabId !== "number") {
    return { name: "app-state", payload: normalizeAppState(globalAppState) };
  }

  const tabAppState = await readTabAppState(tabId);
  return {
    name: "app-state",
    payload: normalizeAppState({
      ...globalAppState,
      ...tabAppState,
    }),
  };
}

function saveGlobalAppState(appState: AppState): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(
      {
        [GLOBAL_APP_STATE_KEY]: {
          ghAccessToken: appState.ghAccessToken,
        },
      },
      () => resolve(),
    );
  });
}

function saveTabAppState(tabId: number, appState: AppState): Promise<void> {
  return new Promise((resolve) => {
    const tabScopedState: TabScopedAppState = {
      extensionIsActive: appState.extensionIsActive,
      appVersion: appState.appVersion,
    };
    chrome.storage.session.set(
      { [getTabAppStateKey(tabId)]: tabScopedState },
      () => resolve(),
    );
  });
}

async function saveAppState(tabId: number | undefined, appState: AppState) {
  const normalizedAppState = normalizeAppState(appState);
  await saveGlobalAppState(normalizedAppState);
  if (typeof tabId !== "number") {
    return;
  }
  await saveTabAppState(tabId, normalizedAppState);
}

function deleteTabAppState(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.session.remove(getTabAppStateKey(tabId), () => resolve());
  });
}

function cleanupLegacyAppStateStorage(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(LEGACY_TAB_APP_STATE_KEY, () => {
      resolve();
    });
  });
}

export {
  createStateMessage,
  saveAppState,
  deleteTabAppState,
  cleanupLegacyAppStateStorage,
};
