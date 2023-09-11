import { AppName } from "../types";
import { injectScript } from "./helpers";
import type { InjectScriptMessage } from "./types";

function messageHandler(
  message: InjectScriptMessage,
  port: chrome.runtime.Port
) {
  console.log(message);
  // switch (message.name) {
  //   case "create-note": {
  //     // colorizeSelection(port);
  //   }
  // }
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

    injectScript();

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
