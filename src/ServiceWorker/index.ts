import { AppName, type AppMessage } from "../types";

console.log("executing service worker script");

let popupPort: chrome.runtime.Port | null = null;
let contentScriptPort: chrome.runtime.Port | null = null;

let appState: AppMessage["payload"] = {
  appVersion: "staging",
  isActive: true,
};

function handlePopupMessages(message: AppMessage) {
  console.log("received popup message", message);
  switch (message.name) {
    case "app-state": {
      appState = { ...message.payload };
      break;
    }
    default: {
      console.error("unknown message received");
    }
  }
}

// TODO rethink if it is really needed to update popup and content script by their ports, it seems that it is not needed at the end
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === AppName.Popup) {
    popupPort = port;
    console.log("popup open detected");
    const message: AppMessage = { name: "app-state", payload: appState };
    console.log("sending", message);
    popupPort.postMessage(message);
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
