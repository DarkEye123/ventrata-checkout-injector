import { beforeEach, describe, expect, it, vi } from "vitest";

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

type Listener<TArgs extends unknown[]> = (...args: TArgs) => void | Promise<void>;

type ChromeEventMock<TArgs extends unknown[]> = {
  addListener: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
  dispatch: (...args: TArgs) => Promise<void>;
  listeners: Listener<TArgs>[];
};

function createChromeEventMock<TArgs extends unknown[]>(): ChromeEventMock<TArgs> {
  const listeners: Listener<TArgs>[] = [];

  return {
    listeners,
    addListener: vi.fn((listener: Listener<TArgs>) => {
      listeners.push(listener);
    }),
    removeListener: vi.fn((listener: Listener<TArgs>) => {
      const listenerIndex = listeners.indexOf(listener);
      if (listenerIndex >= 0) {
        listeners.splice(listenerIndex, 1);
      }
    }),
    async dispatch(...args: TArgs) {
      for (const listener of listeners) {
        await listener(...args);
      }
    },
  };
}

function createTab(id: number, url = "https://customer.example/checkout") {
  return { id, url } as chrome.tabs.Tab;
}

function createContextMenuClickData(
  menuItemId: string,
  overrides: Partial<chrome.contextMenus.OnClickData> = {},
) {
  return {
    menuItemId,
    editable: false,
    pageUrl: "https://customer.example/checkout",
    ...overrides,
  } as chrome.contextMenus.OnClickData;
}

const runMigrationsMock = vi.fn(async () => undefined);
const createStateMessageMock = vi.fn(async (tabId?: number) => ({
  name: "app-state" as const,
  payload: {
    extensionIsActive: true,
    checkoutScriptConfigOverrides: { env: "live" as const },
    appVersion: "staging",
    ghAccessToken: undefined,
  },
  tabId,
}));
const deleteTabAppStateMock = vi.fn(async () => undefined);
const saveAppStateMock = vi.fn(async () => undefined);
const clearTabRulesMock = vi.fn(async () => undefined);
const updateRulesMock = vi.fn(async () => undefined);

vi.mock("./migrations", () => ({
  runMigrations: runMigrationsMock,
}));

vi.mock("./state", () => ({
  createStateMessage: createStateMessageMock,
  deleteTabAppState: deleteTabAppStateMock,
  saveAppState: saveAppStateMock,
}));

vi.mock("./helpers", () => ({
  clearTabRules: clearTabRulesMock,
  updateRules: updateRulesMock,
}));

describe("service worker copy configuration delivery", () => {
  let onInstalled: ChromeEventMock<[]>;
  let onStartup: ChromeEventMock<[]>;
  let onClicked: ChromeEventMock<[chrome.contextMenus.OnClickData, chrome.tabs.Tab?]>;
  let onConnect: ChromeEventMock<[chrome.runtime.Port]>;
  let onRuntimeMessage: ChromeEventMock<
    [unknown, chrome.runtime.MessageSender, ((response?: unknown) => void)?]
  >;
  let onActivated: ChromeEventMock<[{ tabId: number; windowId: number }]>;
  let onUpdated: ChromeEventMock<[number, { status?: string; url?: string }, chrome.tabs.Tab]>;
  let onRemoved: ChromeEventMock<[number, { isWindowClosing?: boolean; windowId?: number }]>;

  let tabsQueryMock: ReturnType<typeof vi.fn>;
  let tabsGetMock: ReturnType<typeof vi.fn>;
  let executeScriptMock: ReturnType<typeof vi.fn>;
  let sendMessageMock: ReturnType<typeof vi.fn>;
  let createMenuMock: ReturnType<typeof vi.fn>;
  let updateMenuMock: ReturnType<typeof vi.fn>;
  let removeAllMenusMock: ReturnType<typeof vi.fn>;
  let setIconMock: ReturnType<typeof vi.fn>;
  let reloadTabMock: ReturnType<typeof vi.fn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let activeLastFocusedTabId: number | undefined;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    onInstalled = createChromeEventMock();
    onStartup = createChromeEventMock();
    onClicked = createChromeEventMock();
    onConnect = createChromeEventMock();
    onRuntimeMessage = createChromeEventMock();
    onActivated = createChromeEventMock();
    onUpdated = createChromeEventMock();
    onRemoved = createChromeEventMock();
    activeLastFocusedTabId = 99;

    tabsQueryMock = vi.fn(async (queryInfo?: chrome.tabs.QueryInfo) => {
      if (queryInfo?.active && queryInfo?.lastFocusedWindow) {
        return activeLastFocusedTabId
          ? [{ id: activeLastFocusedTabId, url: "https://customer.example/checkout" }]
          : [];
      }

      if (queryInfo?.active) {
        return [{ id: 1, url: "https://customer.example/checkout" }];
      }

      return [
        { id: 11, url: "https://customer.example/checkout" },
        { id: 12, url: "chrome://extensions" },
      ];
    });

    tabsGetMock = vi.fn(async (tabId: number) => {
      if (tabId === 12) {
        return { id: 12, url: "chrome://extensions" };
      }

      return { id: tabId, url: "https://customer.example/checkout" };
    });

    executeScriptMock = vi.fn(async () => undefined);
    sendMessageMock = vi.fn(async () => undefined);
    createMenuMock = vi.fn(
      (properties: chrome.contextMenus.CreateProperties, callback?: () => void) => {
        callback?.();
        return properties.id ?? "menu-id";
      },
    );
    updateMenuMock = vi.fn(async () => undefined);
    removeAllMenusMock = vi.fn(async () => undefined);
    setIconMock = vi.fn(async () => undefined);
    reloadTabMock = vi.fn();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    Object.assign(globalThis, {
      chrome: {
        runtime: {
          lastError: undefined,
          onInstalled,
          onStartup,
          onConnect,
          onMessage: onRuntimeMessage,
        },
        contextMenus: {
          create: createMenuMock,
          update: updateMenuMock,
          removeAll: removeAllMenusMock,
          onClicked,
        },
        tabs: {
          query: tabsQueryMock,
          get: tabsGetMock,
          sendMessage: sendMessageMock,
          reload: reloadTabMock,
          onActivated,
          onUpdated,
          onRemoved,
        },
        scripting: {
          executeScript: executeScriptMock,
        },
        action: {
          setIcon: setIconMock,
        },
      },
    });

    await import("./index");
    await flushPromises();
    vi.clearAllMocks();
  });

  it("creates the copy configuration context menu hierarchy on install", async () => {
    await onInstalled.dispatch();
    await flushPromises();

    expect(removeAllMenusMock).toHaveBeenCalledTimes(1);
    expect(createMenuMock).toHaveBeenNthCalledWith(
      1,
      {
        id: "ventrata-checkout-injector",
        title: "Ventrata Checkout Injector",
        contexts: ["all"],
        visible: false,
      },
      expect.any(Function),
    );
    expect(createMenuMock).toHaveBeenNthCalledWith(
      2,
      {
        id: "copy-configuration",
        title: "Copy configuration",
        contexts: ["all"],
        parentId: "ventrata-checkout-injector",
        visible: false,
      },
      expect.any(Function),
    );
  });

  it("shows the context menu only after the active tab reports checkout markers", async () => {
    await onRuntimeMessage.dispatch(
      {
        name: "checkout-script-presence",
        payload: {
          hasCheckoutScript: true,
        },
      },
      {
        tab: createTab(99),
      },
      undefined,
    );
    await flushPromises();

    expect(updateMenuMock).toHaveBeenCalledWith("ventrata-checkout-injector", {
      visible: true,
    });
    expect(updateMenuMock).toHaveBeenCalledWith("copy-configuration", {
      visible: true,
    });
  });

  it("injects open tabs on install and skips non-http tabs", async () => {
    await onInstalled.dispatch();
    await flushPromises();

    expect(tabsQueryMock).toHaveBeenCalledWith({});
    expect(executeScriptMock.mock.calls.map(([call]) => call)).toEqual([
      {
        target: { tabId: 11 },
        files: ["./pageHook.js"],
        world: "MAIN",
      },
      {
        target: { tabId: 11 },
        files: ["./contentScript.js"],
      },
    ]);
  });

  it("keeps the menu hidden on tab activation until the content script reports presence", async () => {
    activeLastFocusedTabId = 11;

    await onActivated.dispatch({ tabId: 11, windowId: 1 });
    await flushPromises();

    expect(updateMenuMock).toHaveBeenCalledWith("ventrata-checkout-injector", {
      visible: false,
    });
    expect(updateMenuMock).toHaveBeenCalledWith("copy-configuration", {
      visible: false,
    });
  });

  it("uses cached checkout presence for subsequent active-tab visibility sync", async () => {
    activeLastFocusedTabId = 11;

    await onRuntimeMessage.dispatch(
      {
        name: "checkout-script-presence",
        payload: {
          hasCheckoutScript: true,
        },
      },
      {
        tab: createTab(11),
      },
      undefined,
    );
    await flushPromises();
    vi.clearAllMocks();

    await onActivated.dispatch({ tabId: 11, windowId: 1 });
    await flushPromises();

    expect(updateMenuMock).toHaveBeenCalledWith("ventrata-checkout-injector", {
      visible: true,
    });
    expect(updateMenuMock).toHaveBeenCalledWith("copy-configuration", {
      visible: true,
    });
  });

  it("sends the copy message for the clicked tab without reinjecting scripts", async () => {
    await onClicked.dispatch(createContextMenuClickData("copy-configuration"), createTab(77));
    await flushPromises();

    expect(executeScriptMock).not.toHaveBeenCalled();
    expect(sendMessageMock).toHaveBeenCalledWith(77, {
      name: "copy-checkout-configuration",
    });
  });

  it("ignores copy configuration clicks when the clicked tab id is missing", async () => {
    await onClicked.dispatch(
      createContextMenuClickData("copy-configuration"),
      {} as chrome.tabs.Tab,
    );
    await flushPromises();

    expect(executeScriptMock).not.toHaveBeenCalled();
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it("ignores unrelated context menu clicks", async () => {
    await onClicked.dispatch(createContextMenuClickData("other-item"), createTab(77));
    await flushPromises();

    expect(executeScriptMock).not.toHaveBeenCalled();
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it("logs and swallows copy configuration message delivery failures", async () => {
    const sendError = new Error("No receiver");
    sendMessageMock.mockRejectedValueOnce(sendError);

    await onClicked.dispatch(createContextMenuClickData("copy-configuration"), createTab(77));
    await flushPromises();

    expect(sendMessageMock).toHaveBeenCalledWith(77, {
      name: "copy-checkout-configuration",
    });
    expect(warnSpy).toHaveBeenCalledWith(
      "Service Worker::failed to send copy configuration message",
      {
        tabId: 77,
        error: sendError,
      },
    );
  });

  it("hides the menu immediately on active-tab URL changes and waits for complete before reinjecting", async () => {
    activeLastFocusedTabId = 11;

    await onUpdated.dispatch(11, { url: "https://customer.example/new-page" }, createTab(11));
    await flushPromises();

    expect(executeScriptMock).toEqual(expect.any(Function));
    expect(updateMenuMock).toHaveBeenCalledWith("ventrata-checkout-injector", {
      visible: false,
    });
    expect(updateMenuMock).toHaveBeenCalledWith("copy-configuration", {
      visible: false,
    });

    vi.clearAllMocks();

    await onUpdated.dispatch(11, { status: "complete" }, createTab(11));
    await flushPromises();

    expect(executeScriptMock.mock.calls.map(([call]) => call)).toEqual([
      {
        target: { tabId: 11 },
        files: ["./pageHook.js"],
        world: "MAIN",
      },
      {
        target: { tabId: 11 },
        files: ["./contentScript.js"],
      },
    ]);
    expect(updateMenuMock).toHaveBeenCalledWith("ventrata-checkout-injector", {
      visible: false,
    });
    expect(updateMenuMock).toHaveBeenCalledWith("copy-configuration", {
      visible: false,
    });
  });
});
