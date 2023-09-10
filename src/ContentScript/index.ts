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
  console.log("content script");
  if (!window.VentrataInjector?.contentScriptInjected) {
    window.VentrataInjector = window.VentrataInjector
      ? { ...window.VentrataInjector, contentScriptInjected: true }
      : { contentScriptInjected: true };
    const port = chrome.runtime.connect({
      name: `${AppName.ContentScript}`,
    });

    port.onMessage.addListener(messageHandler);

    port.onDisconnect.addListener(() => {
      window.VentrataInjector = window.VentrataInjector ?? {
        contentScriptInjected: false,
      };
      window.VentrataInjector.contentScriptInjected = false;
    });
  }
}

console.log("content script");

init();
