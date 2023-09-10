import { AppName } from "../types";
import contentScriptInit from "../ContentScript/index";

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

async function init() {
  const activeTabs = await chrome.tabs.query({
    active: true,
  });

  activeTabs.forEach((tab) => {
    if (tab.id) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["./contentScript.js"],
      });
    }
  });

  console.log("executing service worker script");
  console.log(activeTabs);
}

init();
contentScriptInit();
