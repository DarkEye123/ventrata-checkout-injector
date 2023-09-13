import { AppName, type AppMessage } from "../types";
import { injectScript } from "./helpers";

function messageHandler(message: AppMessage) {
  switch (message.name) {
    case "app-state": {
      if (message.payload.isActive) {
        injectScript(message.payload.appVersion);
      }
    }
  }
}

chrome.runtime.onMessage.addListener((message) => {
  console.log("content script message", message);
});

function init() {
  if (!window.VentrataInjector?.contentScriptInjected) {
    console.log("Ventrata Injector::content script init");
    window.VentrataInjector = window.VentrataInjector
      ? { ...window.VentrataInjector, contentScriptInjected: true }
      : { contentScriptInjected: true };

    const port = chrome.runtime.connect({
      name: `${AppName.ContentScript}`,
    });

    console.log("Ventrata Injector::content script connected");

    port.onMessage.addListener(messageHandler);

    port.onDisconnect.addListener(() => {
      console.log("Ventrata Injector::content script disconnected");
      window.VentrataInjector = window.VentrataInjector ?? {
        contentScriptInjected: false,
      };
      window.VentrataInjector.contentScriptInjected = false;
    });
  }
}

init();
