import { ScriptReference, type StateMessage } from "../types";
import { appState } from "./state";

async function unregisterAllDynamicContentScripts() {
  try {
    const scripts = await chrome.scripting.getRegisteredContentScripts();
    const scriptIds = scripts.map((script) => script);
    console.log(scriptIds);
    // return chrome.scripting.unregisterContentScripts(scriptIds);
  } catch (error) {
    const message = [
      "An unexpected error occurred while",
      "unregistering dynamic content scripts.",
    ].join(" ");
    throw new Error(message, { cause: error });
  }
}

function updateRules(applyAppRules: boolean) {
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1, 2], // these are persisted even service worker is reloaded, thus cleanup
    addRules: applyAppRules
      ? [
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
        ]
      : [],
  });
}

function updateContentScript(
  port: chrome.runtime.Port,
  newState: StateMessage["payload"]
) {
  const stateMessage: StateMessage = { name: "app-state", payload: newState };
  port.postMessage(stateMessage);
}

export { unregisterAllDynamicContentScripts, updateRules, updateContentScript };
