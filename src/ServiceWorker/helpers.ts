import { ScriptReference, type AppStateMessage } from "../types";

const LEGACY_DYNAMIC_RULE_IDS = [1, 2];
const SESSION_RULE_ID_OFFSET = 100000;

function getTabRuleIds(tabId: number) {
  const baseRuleId = SESSION_RULE_ID_OFFSET + tabId * 10;
  return {
    allowRuleId: baseRuleId + 1,
    blockRuleId: baseRuleId + 2,
  };
}

async function cleanupLegacyDynamicRules() {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: LEGACY_DYNAMIC_RULE_IDS,
    addRules: [],
  });
}

async function updateRules(tabId: number | undefined, applyAppRules: boolean) {
  await cleanupLegacyDynamicRules();

  if (typeof tabId !== "number") {
    return;
  }

  const { allowRuleId, blockRuleId } = getTabRuleIds(tabId);

  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [allowRuleId, blockRuleId],
    addRules: applyAppRules
      ? [
          {
            id: allowRuleId,
            action: {
              type: chrome.declarativeNetRequest.RuleActionType.ALLOW,
            },
            condition: {
              urlFilter: `https://cdn.checkout.ventrata.com/v3/production/ventrata-checkout.min.js${ScriptReference}`,
              tabIds: [tabId],
            },
          },
          {
            id: blockRuleId,
            action: {
              type: chrome.declarativeNetRequest.RuleActionType.BLOCK,
            },
            condition: {
              urlFilter:
                "https://cdn.checkout.ventrata.com/v3/production/ventrata-checkout.min.js",
              tabIds: [tabId],
            },
          },
        ]
      : [],
  });
}

async function clearTabRules(tabId: number) {
  const { allowRuleId, blockRuleId } = getTabRuleIds(tabId);
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [allowRuleId, blockRuleId],
    addRules: [],
  });
}

function updateContentScript(
  port: chrome.runtime.Port,
  newState: AppStateMessage["payload"],
) {
  const stateMessage: AppStateMessage = {
    name: "app-state",
    payload: newState,
  };
  port.postMessage(stateMessage);
}

export {
  updateRules,
  clearTabRules,
  cleanupLegacyDynamicRules,
  updateContentScript,
};
