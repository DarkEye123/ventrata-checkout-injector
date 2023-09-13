import { AppName, type AppMessage } from "../types";
import { updateRules } from "./helpers";
import { appState, createStateMessage, updateAppState } from "./state";

console.log("executing service worker script");

let popupPort: chrome.runtime.Port | null = null;
let contentScriptPort: chrome.runtime.Port | null = null;

function handlePopupMessages(message: AppMessage) {
  console.log("received popup message", message);
  switch (message.name) {
    case "app-state": {
      updateAppState(message.payload);
      updateRules(message.payload.isActive);
      chrome.tabs.reload();
      break;
    }
    case "save-app-state": {
      chrome.storage.local.set({ appState });
      break;
    }
    default: {
      console.error("unknown message received");
    }
  }
}

// TODO rethink if it is really needed to update popup and content script by their ports, it seems that it is not needed at the end
chrome.runtime.onConnect.addListener((port) => {
  const stateMessage = createStateMessage();
  if (port.name === AppName.Popup) {
    popupPort = port;
    console.log("popup open detected");
    popupPort.postMessage(stateMessage);
    popupPort.postMessage({
      contentScriptPort,
    });
    contentScriptPort?.postMessage({
      popupPort,
    });
    port.onDisconnect.addListener(() => {
      popupPort?.onMessage.removeListener(handlePopupMessages);
      popupPort = null;
    });
    popupPort.onMessage.addListener(handlePopupMessages);
  } else if (port.name.includes(AppName.ContentScript)) {
    console.log("content script detected");
    contentScriptPort = port;
    popupPort?.postMessage({
      contentScriptPort,
    });
    contentScriptPort.postMessage({
      popupPort,
    });
    contentScriptPort.postMessage(stateMessage);
    port.onDisconnect.addListener(() => {
      contentScriptPort = null;
    });
  } else {
    console.error("unknown sender ID detected");
  }
});

chrome.runtime.onMessage.addListener((message) => {
  console.log("worker script message", message);
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
