enum AppName {
  Popup = "ventrata-injector-popup",
  ContentScript = "ventrata-injector-content-script",
}

interface GenericMessage {
  name: string;
  payload?: unknown;
}

const ScriptReference = "?ref=ventrata-injector-extension";

export { AppName, type GenericMessage, ScriptReference };
