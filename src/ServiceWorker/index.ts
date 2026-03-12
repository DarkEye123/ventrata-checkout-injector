import { AppName, type AppMessage } from "../types";
import { clearTabRules, updateRules } from "./helpers";
import { runMigrations } from "./migrations";
import { createStateMessage, deleteTabAppState, saveAppState } from "./state";

console.log("executing service worker script");

const COPY_CONFIGURATION_MENU_PARENT_ID = "ventrata-checkout-injector";
const COPY_CONFIGURATION_MENU_ITEM_ID = "copy-configuration";
const tabCheckoutScriptPresence = new Map<number, boolean>();

function createContextMenuItem(createProperties: chrome.contextMenus.CreateProperties) {
  return new Promise<void>((resolve, reject) => {
    chrome.contextMenus.create(createProperties, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve();
    });
  });
}

function getActionTabOptions(tabId: number | undefined) {
  return typeof tabId === "number" ? { tabId } : {};
}

async function resolveTabId(tabId: number | undefined): Promise<number | undefined> {
  if (typeof tabId === "number") {
    return tabId;
  }

  const activeTabs = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  return activeTabs[0]?.id;
}

function getActionIconPath(extensionIsActive: boolean) {
  return extensionIsActive ? "assets/script-active.png" : "assets/script-inactive.png";
}

async function setActionIcon(tabId: number | undefined, extensionIsActive: boolean) {
  if (typeof tabId !== "number") {
    return;
  }

  await chrome.action.setIcon({
    ...getActionTabOptions(tabId),
    path: getActionIconPath(extensionIsActive),
  });
}

async function syncActionIcon(tabId: number | undefined) {
  if (typeof tabId !== "number") {
    return;
  }

  try {
    const stateMessage = await createStateMessage(tabId);
    await setActionIcon(tabId, stateMessage.payload.extensionIsActive);
  } catch (error) {
    console.warn("Service Worker::failed to sync action icon", {
      tabId,
      error,
    });
  }
}

async function createContextMenu() {
  try {
    await chrome.contextMenus.removeAll();
    await createContextMenuItem({
      id: COPY_CONFIGURATION_MENU_PARENT_ID,
      title: "Ventrata Checkout Injector",
      contexts: ["all"],
      visible: false,
    });
    await createContextMenuItem({
      id: COPY_CONFIGURATION_MENU_ITEM_ID,
      title: "Copy configuration",
      contexts: ["all"],
      parentId: COPY_CONFIGURATION_MENU_PARENT_ID,
      visible: false,
    });
  } catch (error) {
    console.warn("Service Worker::failed to create context menu", error);
  }
}

function isInjectableTabUrl(url?: string) {
  return typeof url === "string" && /^https?:\/\//.test(url);
}

async function setContextMenuVisibility(isVisible: boolean) {
  try {
    await chrome.contextMenus.update(COPY_CONFIGURATION_MENU_PARENT_ID, {
      visible: isVisible,
    });
    await chrome.contextMenus.update(COPY_CONFIGURATION_MENU_ITEM_ID, {
      visible: isVisible,
    });
  } catch (error) {
    console.warn("Service Worker::failed to update context menu visibility", error);
  }
}

async function syncContextMenuVisibilityForTab(tabId: number | undefined) {
  if (typeof tabId !== "number") {
    await setContextMenuVisibility(false);
    return;
  }

  await setContextMenuVisibility(tabCheckoutScriptPresence.get(tabId) === true);
}

async function injectTabScripts(tabId: number) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!isInjectableTabUrl(tab.url)) {
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["./pageHook.js"],
      world: "MAIN",
    });
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["./contentScript.js"],
    });
  } catch (error) {
    console.warn("Service Worker::failed to inject tab scripts", {
      tabId,
      error,
    });
  }
}

async function injectOpenTabs() {
  const tabs = await chrome.tabs.query({});

  await Promise.all(
    tabs.map(async (tab) => {
      if (typeof tab.id === "number") {
        await injectTabScripts(tab.id);
      }
    }),
  );
}

function createPopupMessageHandler(port: chrome.runtime.Port) {
  return async (message: AppMessage) => {
    console.log("received popup message", message);
    switch (message.name) {
      case "get-app-state": {
        const stateMessage = await createStateMessage(message.payload.tabId);
        port.postMessage(stateMessage);
        await setActionIcon(message.payload.tabId, stateMessage.payload.extensionIsActive);
        break;
      }
      case "save-app-state": {
        const { tabId, appState } = message.payload;
        const resolvedTabId = await resolveTabId(tabId);
        await saveAppState(resolvedTabId, appState);
        await updateRules(resolvedTabId, appState.extensionIsActive);
        await setActionIcon(resolvedTabId, appState.extensionIsActive);

        if (typeof resolvedTabId === "number") {
          chrome.tabs.reload(resolvedTabId);
        } else {
          chrome.tabs.reload();
        }
        break;
      }
      default: {
        console.error("unknown message received");
      }
    }
  };
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== COPY_CONFIGURATION_MENU_ITEM_ID || typeof tab?.id !== "number") {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, {
      name: "copy-checkout-configuration",
    } satisfies AppMessage);
  } catch (error) {
    console.warn("Service Worker::failed to send copy configuration message", {
      tabId: tab.id,
      error,
    });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  void createContextMenu();
  void injectOpenTabs();
});

chrome.runtime.onStartup.addListener(() => {
  void createContextMenu();
  void injectOpenTabs();
});

// TODO rethink if it is really needed to update popup and content script by their ports, it seems that it is not needed at the end
chrome.runtime.onConnect.addListener(async (port) => {
  console.log("Service Worker::onConnect", port);

  if (port.name === AppName.Popup) {
    console.log("popup open detected");
    const popupMessageHandler = createPopupMessageHandler(port);
    port.onMessage.addListener(popupMessageHandler);
    port.onDisconnect.addListener(() => {
      port.onMessage.removeListener(popupMessageHandler);
    });
  } else if (port.name.includes(AppName.ContentScript)) {
    console.log("content script detected");
    const tabId = port.sender?.tab?.id;
    const stateMessage = await createStateMessage(tabId);
    console.log("Service Worker::stateMessage", stateMessage);
    port.postMessage(stateMessage);
    await setActionIcon(tabId, stateMessage.payload.extensionIsActive);
    port.onDisconnect.addListener(() => {
      // no-op
    });
  } else {
    console.error("unknown sender ID detected");
  }
});

chrome.runtime.onMessage.addListener((message: AppMessage, sender) => {
  if (message.name !== "checkout-script-presence") {
    return;
  }

  const tabId = sender.tab?.id;
  if (typeof tabId !== "number") {
    return;
  }

  tabCheckoutScriptPresence.set(tabId, message.payload.hasCheckoutScript);
  void chrome.tabs
    .query({
      active: true,
      lastFocusedWindow: true,
    })
    .then(([activeTab]) => {
      if (activeTab?.id === tabId) {
        return syncContextMenuVisibilityForTab(tabId);
      }
    });
});

async function init() {
  try {
    await runMigrations();
  } catch (error) {
    console.error("Service Worker::migration runner failed", error);
  }

  const activeTabs = await chrome.tabs.query({
    active: true,
  });

  chrome.tabs.onActivated.addListener(async (tab) => {
    const { tabId } = tab;
    await injectTabScripts(tabId);
    await syncActionIcon(tabId);
    await syncContextMenuVisibilityForTab(tabId);
  });

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (!changeInfo.status && !changeInfo.url) {
      return;
    }

    if (changeInfo.url) {
      tabCheckoutScriptPresence.delete(tabId);

      const [activeTab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });

      if (activeTab?.id === tabId) {
        await setContextMenuVisibility(false);
      }
    }

    if (changeInfo.status !== "complete") {
      return;
    }

    await injectTabScripts(tabId);
    await syncActionIcon(tabId);
    await syncContextMenuVisibilityForTab(tabId);
  });

  chrome.tabs.onRemoved.addListener(async (tabId) => {
    tabCheckoutScriptPresence.delete(tabId);
    await deleteTabAppState(tabId);
    await clearTabRules(tabId);
  });

  activeTabs.forEach(async (tab) => {
    if (tab.id) {
      await injectTabScripts(tab.id);
      await syncActionIcon(tab.id);
      await syncContextMenuVisibilityForTab(tab.id);
    }
  });
}

init();
