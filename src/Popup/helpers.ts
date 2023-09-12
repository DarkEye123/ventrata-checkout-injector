import type { AppMessage } from "../types";

async function sendMessage(port: chrome.runtime.Port, message: AppMessage) {
  const activeTabs = await chrome.tabs.query({
    active: true,
  });
  activeTabs.forEach((tab) => {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, message);
    }
  });
  port.postMessage(message);
}

export { sendMessage };
