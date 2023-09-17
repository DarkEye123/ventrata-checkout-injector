enum AppName {
  Popup = "ventrata-injector-popup",
  ContentScript = "ventrata-injector-content-script",
}

interface GenericMessage {
  name: string;
  payload?: unknown;
}

interface StateMessage extends GenericMessage {
  name: "app-state";
  payload: {
    isActive: boolean;
    appVersion: string; //staging, production, or PR string
    ghAccessToken?: string;
  };
}

interface SaveAppStateMessage extends GenericMessage {
  name: "save-app-state";
}

type AppMessage = StateMessage | SaveAppStateMessage;

const ScriptReference = "?ref=ventrata-injector-extension";

export {
  AppName,
  type GenericMessage,
  ScriptReference,
  type AppMessage,
  type StateMessage,
  type SaveAppStateMessage,
};
