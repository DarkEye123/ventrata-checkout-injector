// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const initCheckoutPresenceSyncMock = vi.fn();
const rememberContextMenuCheckoutConfigurationMock = vi.fn();
const handleModifierShortcutCopyMock = vi.fn();
const handleAppStateMessageMock = vi.fn();
const copyLatestCheckoutConfigurationMock = vi.fn();

vi.mock("./checkoutPresence", () => ({
  initCheckoutPresenceSync: initCheckoutPresenceSyncMock,
}));

vi.mock("./copyCheckoutConfiguration", () => ({
  rememberContextMenuCheckoutConfiguration: rememberContextMenuCheckoutConfigurationMock,
  handleModifierShortcutCopy: handleModifierShortcutCopyMock,
  copyLatestCheckoutConfiguration: copyLatestCheckoutConfigurationMock,
}));

vi.mock("./appState", () => ({
  handleAppStateMessage: handleAppStateMessageMock,
}));

describe("content script bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    Object.assign(window, {
      VentrataInjector: undefined,
    });

    Object.assign(globalThis, {
      chrome: {
        runtime: {
          connect: vi.fn(() => ({
            onMessage: {
              addListener: vi.fn(),
            },
            onDisconnect: {
              addListener: vi.fn(),
            },
          })),
          onMessage: {
            addListener: vi.fn(),
          },
        },
      },
    });
  });

  it("initializes presence sync on first injection", async () => {
    await import("./index");

    expect(initCheckoutPresenceSyncMock).toHaveBeenCalledTimes(1);
  });

  it("re-syncs presence on reinjection even when the content script was already initialized", async () => {
    await import("./index");
    vi.resetModules();

    await import("./index");

    expect(initCheckoutPresenceSyncMock).toHaveBeenCalledTimes(2);
  });
});
