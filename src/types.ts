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
  };
}

type AppMessage = StateMessage;

const ScriptReference = "?ref=ventrata-injector-extension";

export { AppName, type GenericMessage, ScriptReference, type AppMessage };
