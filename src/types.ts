type CheckoutScriptConfigOverrides = {
  env: "live" | "test";
  [key: string]: unknown;
};

type AppState = {
  extensionIsActive: boolean;
  checkoutScriptConfigOverrides: CheckoutScriptConfigOverrides;
  appVersion: string;
  ghAccessToken?: string;
};

const Staging = "staging";
const Production = "production";

const SupportedEnvironments = [Staging, Production];

enum AppName {
  Popup = "ventrata-injector-popup",
  ContentScript = "ventrata-injector-content-script",
}

interface GenericMessage {
  name: string;
  payload?: unknown;
}

interface GetAppStateMessage extends GenericMessage {
  name: "get-app-state";
  payload: {
    tabId?: number;
  };
}

interface SaveAppStateMessage extends GenericMessage {
  name: "save-app-state";
  payload: {
    tabId?: number;
    appState: AppState;
  };
}

interface AppStateMessage extends GenericMessage {
  name: "app-state";
  payload: AppState;
}

type AppMessage = AppStateMessage | SaveAppStateMessage | GetAppStateMessage;

const ScriptReference = "?ref=ventrata-injector-extension";

export {
  AppName,
  type GenericMessage,
  ScriptReference,
  type AppMessage,
  type GetAppStateMessage,
  type SaveAppStateMessage,
  Staging,
  Production,
  SupportedEnvironments,
  type CheckoutScriptConfigOverrides,
  type AppState,
  type AppStateMessage,
};
