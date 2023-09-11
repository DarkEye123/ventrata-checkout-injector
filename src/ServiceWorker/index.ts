import { AppName, ScriptReference } from "../types";

console.log("executing service worker script");

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

// chrome.runtime.getBackgroundPage((window) => {
//   console.log("window", window);
// });

chrome.declarativeNetRequest.getDynamicRules().then((data) => {
  console.log(data);
});

chrome.declarativeNetRequest.updateDynamicRules({
  removeRuleIds: [1, 2],
  addRules: [
    {
      id: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.ALLOW,
      },
      condition: {
        urlFilter: `https://cdn.checkout.ventrata.com/v3/production/ventrata-checkout.min.js${ScriptReference}`,
      },
    },
    {
      id: 2,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.BLOCK,
      },
      condition: {
        urlFilter:
          "https://cdn.checkout.ventrata.com/v3/production/ventrata-checkout.min.js",
      },
    },
  ],
});

chrome.declarativeNetRequest.getDynamicRules().then((data) => {
  console.log(data);
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
