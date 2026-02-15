import type {
  AppMessage,
  GetAppStateMessage,
  SaveAppStateMessage,
} from "../types";
import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import type { Option } from "./types";
import { extendAppTargetVersionStore } from "./stores/appVersions";

const MyOctokit = Octokit.plugin(restEndpointMethods);

function sendSaveAppStateMessage(
  port: chrome.runtime.Port,
  appState: SaveAppStateMessage["payload"]["appState"],
  tabId?: number,
) {
  const stateMessage: SaveAppStateMessage = {
    name: "save-app-state",
    payload: { appState, tabId },
  };
  sendMessage(port, stateMessage);
}

function sendGetAppStateMessage(port: chrome.runtime.Port, tabId?: number) {
  const stateMessage: GetAppStateMessage = {
    name: "get-app-state",
    payload: { tabId },
  };
  sendMessage(port, stateMessage);
}

function sendMessage(port: chrome.runtime.Port, message: AppMessage) {
  port.postMessage(message);
}

async function readCurrentActiveTabId(): Promise<number | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0]?.id;
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

const handleGHAccessTokenUpdate = async (ghAccessToken: string) => {
  const listOfPRNumbers = await readAllPullRequestsNumbers(ghAccessToken);
  if (listOfPRNumbers.length === 0) {
    return {
      error: "fetched PR list is empty, verify token validity",
      success: false,
    };
  }
  const ghApVersions = listOfPRNumbers.map<Option>((data) => ({
    label: data.title,
    value: String(data.number),
  }));
  extendAppTargetVersionStore(ghApVersions);
  return { success: true };
};

export {
  handleGHAccessTokenUpdate,
  sendMessage,
  sendSaveAppStateMessage,
  sendGetAppStateMessage,
  readCurrentActiveTabId,
  readAllPullRequestsNumbers,
};
