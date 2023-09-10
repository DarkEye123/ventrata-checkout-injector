import { AppName } from "../types";

let popupPort: chrome.runtime.Port | null = null;
let contentScriptPort: chrome.runtime.Port | null = null;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === AppName.Popup) {
    popupPort = port;
    console.log("popup open detected");
    port.onDisconnect.addListener(() => {
      popupPort = null;
    });
  } else if (port.name.includes(AppName.ContentScript)) {
    console.log("content script detected");
    port.onDisconnect.addListener(() => {
      contentScriptPort = null;
    });
  } else {
    console.error("unknown sender ID detected");
  }
});

chrome.action.onClicked.addListener((tab) => {
  console.log("executing bg script");
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["./contentScript.js"],
  });
});

async function init() {
  const activeTabs = await chrome.tabs.query({
    active: true,
  });

  console.log("executing service worker script");
  console.log(activeTabs);
}

init();
