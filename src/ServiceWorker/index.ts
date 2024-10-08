import { AppName, type AppMessage } from "../types";
import { updateRules } from "./helpers";
import { createStateMessage, saveAppState } from "./state";

console.log("executing service worker script");

let popupPort: chrome.runtime.Port | null = null;
let contentScriptPort: chrome.runtime.Port | null = null;

async function handlePopupMessages(message: AppMessage) {
  console.log("received popup message", message);
  switch (message.name) {
    case "save-app-state": {
      saveAppState(message.payload);
      updateRules(message.payload.extensionIsActive);
      if (message.payload.extensionIsActive) {
        chrome.action.setIcon({ path: "assets/script-active.png" });
      } else {
        chrome.action.setIcon({ path: "assets/script-inactive.png" });
      }
      chrome.tabs.reload();
      break;
    }
    default: {
      console.error("unknown message received");
    }
  }
}

// TODO rethink if it is really needed to update popup and content script by their ports, it seems that it is not needed at the end
chrome.runtime.onConnect.addListener(async (port) => {
  console.log("Service Worker::onConnect", port);
  const stateMessage = await createStateMessage();
  console.log("Service Worker::stateMessage", stateMessage);
  if (port.name === AppName.Popup) {
    popupPort = port;
    console.log("popup open detected");
    popupPort.postMessage(stateMessage);
    port.onDisconnect.addListener(() => {
      popupPort?.onMessage.removeListener(handlePopupMessages);
      popupPort = null;
    });
    popupPort.onMessage.addListener(handlePopupMessages);
  } else if (port.name.includes(AppName.ContentScript)) {
    console.log("content script detected");
    contentScriptPort = port;
    contentScriptPort.postMessage(stateMessage);
    port.onDisconnect.addListener(() => {
      contentScriptPort = null;
    });
  } else {
    console.error("unknown sender ID detected");
  }
});

async function init() {
  const activeTabs = await chrome.tabs.query({
    active: true,
  });

  chrome.tabs.onActivated.addListener(async (tab) => {
    const { tabId } = tab;
    chrome.scripting.executeScript({
      target: { tabId },
      files: ["./contentScript.js"],
    });
  });

  chrome.tabs.onUpdated.addListener(async (tab) => {
    chrome.scripting.executeScript({
      target: { tabId: tab },
      files: ["./contentScript.js"],
    });
  });

  activeTabs.forEach(async (tab) => {
    if (tab.id) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["./contentScript.js"],
      });
    }
  });
}

init();
