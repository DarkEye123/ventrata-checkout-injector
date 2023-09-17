import type { AppMessage, SaveAppStateMessage, StateMessage } from "../types";
import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";

const MyOctokit = Octokit.plugin(restEndpointMethods);

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

async function readAllPullRequestsNumbers(ghAccessToken: string) {
  const octokit = new MyOctokit({
    auth: ghAccessToken,
  });
  try {
    const result = await octokit.rest.pulls.list({
      owner: "ventrata",
      repo: "checkout-frontend",
      state: "open",
    });
    return (
      result.data?.map((data) => ({
        number: data.number,
        title: data.title,
      })) || []
    );
  } catch (e) {
    console.error(e);
  }
  return [];
}

export {
  sendMessage,
  sendStateMessage,
  sendSaveAppStateMessage,
  readAllPullRequestsNumbers,
};
