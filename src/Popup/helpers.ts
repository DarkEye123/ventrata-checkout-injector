import type { AppMessage, SaveAppStateMessage } from "../types";
import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";

const MyOctokit = Octokit.plugin(restEndpointMethods);

function sendSaveAppStateMessage(
  port: chrome.runtime.Port,
  payload: SaveAppStateMessage["payload"],
) {
  const stateMessage: SaveAppStateMessage = { name: "save-app-state", payload };
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

export { sendMessage, sendSaveAppStateMessage, readAllPullRequestsNumbers };
