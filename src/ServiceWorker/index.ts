import { AppName, type AppMessage } from "../types";
import { VENTRATA_PAGE_MARKER_SELECTORS } from "../checkoutMarkers";
import { clearTabRules, updateRules } from "./helpers";
import { runMigrations } from "./migrations";
import { createStateMessage, deleteTabAppState, saveAppState } from "./state";

console.log("executing service worker script");

const COPY_CONFIGURATION_MENU_PARENT_ID = "ventrata-checkout-injector";
const COPY_CONFIGURATION_MENU_ITEM_ID = "copy-configuration";
let ensureContextMenuPromise: Promise<void> | null = null;
const tabCheckoutScriptPresence = new Map<number, boolean>();

function removeAllContextMenus() {
  return new Promise<void>((resolve, reject) => {
    chrome.contextMenus.removeAll(() => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve();
    });
  });
}

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

function updateContextMenuItem(id: string, updateProperties: chrome.contextMenus.UpdateProperties) {
  return new Promise<void>((resolve, reject) => {
    chrome.contextMenus.update(id, updateProperties, () => {
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
  await removeAllContextMenus();
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
}

async function ensureContextMenu() {
  if (ensureContextMenuPromise) {
    await ensureContextMenuPromise;
    return;
  }

  ensureContextMenuPromise = (async () => {
    try {
      await createContextMenu();
    } catch (error) {
      console.warn("Service Worker::failed to create context menu", error);
    } finally {
      ensureContextMenuPromise = null;
    }
  })();

  await ensureContextMenuPromise;
}

function isInjectableTabUrl(url?: string) {
  return typeof url === "string" && /^https?:\/\//.test(url);
}

async function detectCheckoutScriptPresence(tabId: number) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!isInjectableTabUrl(tab.url)) {
      return false;
    }

    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      args: [VENTRATA_PAGE_MARKER_SELECTORS],
      func: (selectors) => {
        return selectors.some((selector) => document.querySelector(selector));
      },
    });

    return result?.result === true;
  } catch (error) {
    console.warn("Service Worker::failed to detect checkout script presence", {
      tabId,
      error,
    });
    return false;
  }
}

async function setContextMenuVisibility(isVisible: boolean) {
  try {
    await updateContextMenuItem(COPY_CONFIGURATION_MENU_PARENT_ID, {
      visible: isVisible,
    });
    await updateContextMenuItem(COPY_CONFIGURATION_MENU_ITEM_ID, {
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

  const hasCheckoutScript =
    tabCheckoutScriptPresence.get(tabId) === true || (await detectCheckoutScriptPresence(tabId));
  tabCheckoutScriptPresence.set(tabId, hasCheckoutScript);
  await setContextMenuVisibility(hasCheckoutScript);
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
    await injectTabScripts(tab.id);
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
  void ensureContextMenu();
  void injectOpenTabs();
});

chrome.runtime.onStartup.addListener(() => {
  void ensureContextMenu();
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
