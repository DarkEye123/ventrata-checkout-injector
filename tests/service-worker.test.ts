import { beforeEach, describe, expect, it, vi } from "vitest";

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

type Listener<TArgs extends unknown[]> = (...args: TArgs) => void | Promise<void>;

type ChromeEventMock<TArgs extends unknown[]> = {
  addListener: ReturnType<typeof vi.fn<[Listener<TArgs>], void>>;
  removeListener: ReturnType<typeof vi.fn<[Listener<TArgs>], void>>;
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

vi.mock("../src/ServiceWorker/migrations", () => ({
  runMigrations: runMigrationsMock,
}));

vi.mock("../src/ServiceWorker/state", () => ({
  createStateMessage: createStateMessageMock,
  deleteTabAppState: deleteTabAppStateMock,
  saveAppState: saveAppStateMock,
}));

vi.mock("../src/ServiceWorker/helpers", () => ({
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
  let onActivated: ChromeEventMock<[chrome.tabs.TabActiveInfo]>;
  let onUpdated: ChromeEventMock<[number, chrome.tabs.TabChangeInfo, chrome.tabs.Tab]>;
  let onRemoved: ChromeEventMock<[number, chrome.tabs.TabRemoveInfo]>;

  let tabsQueryMock: ReturnType<typeof vi.fn>;
  let tabsGetMock: ReturnType<typeof vi.fn>;
  let executeScriptMock: ReturnType<typeof vi.fn>;
  let sendMessageMock: ReturnType<typeof vi.fn>;
  let createMenuMock: ReturnType<typeof vi.fn>;
  let updateMenuMock: ReturnType<typeof vi.fn>;
  let removeAllMenusMock: ReturnType<typeof vi.fn>;
  let setIconMock: ReturnType<typeof vi.fn>;
  let reloadTabMock: ReturnType<typeof vi.fn>;

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

    tabsQueryMock = vi.fn(async (queryInfo?: chrome.tabs.QueryInfo) => {
      if (queryInfo?.active && queryInfo?.lastFocusedWindow) {
        return [{ id: 99, url: "https://customer.example/checkout" }];
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

    executeScriptMock = vi.fn(
      async (options: chrome.scripting.ScriptInjection<unknown[], unknown>) => {
        if ("func" in options && options.target.tabId === 11) {
          return [{ result: true }];
        }

        if ("func" in options) {
          return [{ result: false }];
        }

        return undefined;
      },
    );
    sendMessageMock = vi.fn(async () => undefined);
    createMenuMock = vi.fn(
      (properties: chrome.contextMenus.CreateProperties, callback?: () => void) => {
        callback?.();
      },
    );
    updateMenuMock = vi.fn(
      (
        _menuItemId: string,
        _updateProperties: chrome.contextMenus.UpdateProperties,
        callback?: () => void,
      ) => {
        callback?.();
      },
    );
    removeAllMenusMock = vi.fn((callback?: () => void) => {
      callback?.();
    });
    setIconMock = vi.fn(async () => undefined);
    reloadTabMock = vi.fn();

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

    await import("../src/ServiceWorker/index");
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
        tab: { id: 99, url: "https://customer.example/checkout" },
      },
      undefined,
    );
    await flushPromises();

    expect(updateMenuMock).toHaveBeenCalledWith(
      "ventrata-checkout-injector",
      {
        visible: true,
      },
      expect.any(Function),
    );
    expect(updateMenuMock).toHaveBeenCalledWith(
      "copy-configuration",
      {
        visible: true,
      },
      expect.any(Function),
    );
  });

  it("injects open tabs on install and skips non-http tabs", async () => {
    await onInstalled.dispatch();
    await flushPromises();

    expect(tabsQueryMock).toHaveBeenCalledWith({});
    const injectionCalls = executeScriptMock.mock.calls
      .map(([call]) => call)
      .filter((call) => "files" in call);

    expect(injectionCalls).toEqual([
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

  it("detects Ventrata page markers before showing the menu for the active tab", async () => {
    await onActivated.dispatch({ tabId: 11, windowId: 1 });
    await flushPromises();

    expect(executeScriptMock).toHaveBeenCalledWith({
      target: { tabId: 11 },
      args: [expect.any(Array)],
      func: expect.any(Function),
    });
    expect(updateMenuMock).toHaveBeenCalledWith(
      "ventrata-checkout-injector",
      {
        visible: true,
      },
      expect.any(Function),
    );
    expect(updateMenuMock).toHaveBeenCalledWith(
      "copy-configuration",
      {
        visible: true,
      },
      expect.any(Function),
    );
  });

  it("sends the copy message after injecting the clicked tab", async () => {
    await onClicked.dispatch({ menuItemId: "copy-configuration" }, { id: 77 });
    await flushPromises();

    const injectionCalls = executeScriptMock.mock.calls
      .map(([call]) => call)
      .filter((call) => "files" in call);

    expect(injectionCalls).toEqual([
      {
        target: { tabId: 77 },
        files: ["./pageHook.js"],
        world: "MAIN",
      },
      {
        target: { tabId: 77 },
        files: ["./contentScript.js"],
      },
    ]);
    expect(sendMessageMock).toHaveBeenCalledWith(77, {
      name: "copy-checkout-configuration",
    });
  });

  it("ignores unrelated context menu clicks", async () => {
    await onClicked.dispatch({ menuItemId: "other-item" }, { id: 77 });
    await flushPromises();

    expect(executeScriptMock).not.toHaveBeenCalled();
    expect(sendMessageMock).not.toHaveBeenCalled();
  });
});
