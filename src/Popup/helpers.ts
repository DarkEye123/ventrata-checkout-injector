import type { AppMessage, StateMessage } from "../types";

function sendStateMessage(
  port: chrome.runtime.Port,
  payload: StateMessage["payload"]
) {
  const stateMessage: StateMessage = { name: "app-state", payload };
  sendMessage(port, stateMessage);
}

function sendMessage(port: chrome.runtime.Port, message: AppMessage) {
  port.postMessage(message);
}

export { sendMessage, sendStateMessage };
