import { AppName } from "../types";
import type { InjectScriptMessage } from "./types";

function messageHandler(
  message: InjectScriptMessage,
  port: chrome.runtime.Port
) {
  // switch (message.name) {
  //   case "create-note": {
  //     // colorizeSelection(port);
  //   }
  // }
}

function init() {
  console.log("Ventrata Injector::content script init");
  if (!window.VentrataInjector?.contentScriptInjected) {
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
