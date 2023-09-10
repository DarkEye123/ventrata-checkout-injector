enum AppName {
  Popup = "ventrata-injector-popup",
  ContentScript = "ventrata-injector-content-script",
}

interface GenericMessage {
  name: string;
  payload?: unknown;
}

export { AppName, type GenericMessage };
