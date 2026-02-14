import { AppName, type AppMessage } from "../types";
import { updateRules } from "./helpers";
import { createStateMessage, saveAppState } from "./state";

console.log("executing service worker script");

function getActionTabOptions(tabId: number | undefined) {
  return typeof tabId === "number" ? { tabId } : {};
}

function createPopupMessageHandler(tabId: number | undefined) {
  return async (message: AppMessage) => {
    console.log("received popup message", message);
    switch (message.name) {
      case "save-app-state": {
        saveAppState(tabId, message.payload);
        await updateRules(tabId, message.payload.extensionIsActive);

        if (message.payload.extensionIsActive) {
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
  const tabId = port.sender?.tab?.id;
  const stateMessage = await createStateMessage(tabId);
  console.log("Service Worker::stateMessage", stateMessage);
  if (port.name === AppName.Popup) {
    console.log("popup open detected");
    port.postMessage(stateMessage);
    const popupMessageHandler = createPopupMessageHandler(tabId);
    port.onMessage.addListener(popupMessageHandler);
    port.onDisconnect.addListener(() => {
      port.onMessage.removeListener(popupMessageHandler);
    });
  } else if (port.name.includes(AppName.ContentScript)) {
    console.log("content script detected");
    port.postMessage(stateMessage);
    port.onDisconnect.addListener(() => {
      // no-op
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
