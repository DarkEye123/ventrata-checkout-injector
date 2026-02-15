import { AppName, type AppMessage } from "../types";
import { clearTabRules, updateRules } from "./helpers";
import { runMigrations } from "./migrations";
import {
  createStateMessage,
  deleteTabAppState,
  saveAppState,
} from "./state";

console.log("executing service worker script");

function getActionTabOptions(tabId: number | undefined) {
  return typeof tabId === "number" ? { tabId } : {};
}

function createPopupMessageHandler(port: chrome.runtime.Port) {
  return async (message: AppMessage) => {
    console.log("received popup message", message);
    switch (message.name) {
      case "get-app-state": {
        const stateMessage = await createStateMessage(message.payload.tabId);
        port.postMessage(stateMessage);
        break;
      }
      case "save-app-state": {
        const { tabId, appState } = message.payload;
        await saveAppState(tabId, appState);
        await updateRules(tabId, appState.extensionIsActive);

        if (appState.extensionIsActive) {
          chrome.action.setIcon({
            ...getActionTabOptions(tabId),
            path: "assets/script-active.png",
          });
        } else {
          chrome.action.setIcon({
            ...getActionTabOptions(tabId),
            path: "assets/script-inactive.png",
          });
        }

        if (typeof tabId === "number") {
          chrome.tabs.reload(tabId);
        } else {
          chrome.tabs.reload();
        }
        break;
      }
      default: {
        console.error("unknown message received");
      }
    }
  };
}

// TODO rethink if it is really needed to update popup and content script by their ports, it seems that it is not needed at the end
chrome.runtime.onConnect.addListener(async (port) => {
  console.log("Service Worker::onConnect", port);

  if (port.name === AppName.Popup) {
    console.log("popup open detected");
    const popupMessageHandler = createPopupMessageHandler(port);
    port.onMessage.addListener(popupMessageHandler);
    port.onDisconnect.addListener(() => {
      port.onMessage.removeListener(popupMessageHandler);
    });
  } else if (port.name.includes(AppName.ContentScript)) {
    console.log("content script detected");
    const tabId = port.sender?.tab?.id;
    const stateMessage = await createStateMessage(tabId);
    console.log("Service Worker::stateMessage", stateMessage);
    port.postMessage(stateMessage);
    port.onDisconnect.addListener(() => {
      // no-op
    });
  } else {
    console.error("unknown sender ID detected");
  }
});

async function init() {
  try {
    await runMigrations();
  } catch (error) {
    console.error("Service Worker::migration runner failed", error);
  }

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

  chrome.tabs.onRemoved.addListener(async (tabId) => {
    await deleteTabAppState(tabId);
    await clearTabRules(tabId);
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
