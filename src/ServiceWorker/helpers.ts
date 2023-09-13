import { ScriptReference, type StateMessage } from "../types";

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
  newState: StateMessage["payload"],
) {
  const stateMessage: StateMessage = { name: "app-state", payload: newState };
  port.postMessage(stateMessage);
}

export { updateRules, updateContentScript };
