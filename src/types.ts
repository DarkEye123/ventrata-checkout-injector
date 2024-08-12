type AppState = {
  extensionIsActive: boolean;
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

interface SaveAppStateMessage extends GenericMessage {
  name: "save-app-state";
  payload: AppState;
}

interface AppStateMessage extends GenericMessage {
  name: "app-state";
  payload: AppState;
}

type AppMessage = AppStateMessage | SaveAppStateMessage;

const ScriptReference = "?ref=ventrata-injector-extension";

export {
  AppName,
  type GenericMessage,
  ScriptReference,
  type AppMessage,
  type SaveAppStateMessage,
  Staging,
  Production,
  SupportedEnvironments,
  type AppState,
  type AppStateMessage,
};
