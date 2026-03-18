import { AppName, type AppMessage } from "../types";
import { handleAppStateMessage } from "./appState";
import {
  copyLatestCheckoutConfiguration,
  handleModifierShortcutCopy,
  rememberContextMenuCheckoutConfiguration,
} from "./copyCheckoutConfiguration";
import { initCheckoutPresenceSync } from "./checkoutPresence";

const RIGHT_MOUSE_BUTTON = 2;

function messageHandler(message: AppMessage) {
  switch (message.name) {
    case "app-state": {
      handleAppStateMessage(message);
      break;
    }
    case "copy-checkout-configuration": {
      copyLatestCheckoutConfiguration();
      break;
    }
    default: {
      console.warn("Ventrata Injector::unexpected content script message", message.name);
      break;
    }
  }
}

function init() {
  if (window.VentrataInjector?.contentScriptInjected) {
    initCheckoutPresenceSync();
    return;
  }

  console.log("Ventrata Injector::content script init");
  window.VentrataInjector = window.VentrataInjector
    ? { ...window.VentrataInjector, contentScriptInjected: true }
    : { contentScriptInjected: true };

  const port = chrome.runtime.connect({
    name: `${AppName.ContentScript}`,
  });

  console.log("Ventrata Injector::content script connected", port);
  initCheckoutPresenceSync();

  chrome.runtime.onMessage.addListener((message: AppMessage) => {
    messageHandler(message);
  });

  window.addEventListener(
    "mousedown",
    (event) => {
      if (event.button === RIGHT_MOUSE_BUTTON) {
        rememberContextMenuCheckoutConfiguration(event);
        return;
      }

      handleModifierShortcutCopy(event);
    },
    true,
  );

  port.onMessage.addListener(messageHandler);

  port.onDisconnect.addListener(() => {
    console.log("Ventrata Injector::content script disconnected");
    window.VentrataInjector = window.VentrataInjector ?? {
      contentScriptInjected: false,
    };
    window.VentrataInjector.contentScriptInjected = false;
  });
}

init();
