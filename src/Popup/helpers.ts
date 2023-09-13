import type { AppMessage, SaveAppStateMessage, StateMessage } from "../types";

function sendStateMessage(
  port: chrome.runtime.Port,
  payload: StateMessage["payload"],
) {
  const stateMessage: StateMessage = { name: "app-state", payload };
  sendMessage(port, stateMessage);
}

function sendSaveAppStateMessage(port: chrome.runtime.Port) {
  const stateMessage: SaveAppStateMessage = { name: "save-app-state" };
  sendMessage(port, stateMessage);
}

function sendMessage(port: chrome.runtime.Port, message: AppMessage) {
  port.postMessage(message);
}

export { sendMessage, sendStateMessage, sendSaveAppStateMessage };
