// @vitest-environment jsdom

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const injectScriptMock = vi.fn();
const hasVentrataCheckoutScriptMock = vi.fn(() => false);

vi.mock("../src/ContentScript/helpers", () => ({
  injectScript: injectScriptMock,
  hasVentrataCheckoutScript: hasVentrataCheckoutScriptMock,
}));

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

function dispatchMouseEvent(
  type: "mousedown" | "contextmenu",
  options: MouseEventInit & { path: EventTarget[] },
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: options.button,
    ctrlKey: options.ctrlKey,
    metaKey: options.metaKey,
  });

  Object.defineProperty(event, "composedPath", {
    value: () => options.path,
  });

  window.dispatchEvent(event);
  return event;
}

describe("content script copy configuration delivery", () => {
  let runtimeMessageListeners: Array<(message: unknown) => void>;
  let portMessageListeners: Array<(message: unknown) => void>;
  let runtimeSendMessageMock: ReturnType<typeof vi.fn>;
  let writeTextMock: ReturnType<typeof vi.fn>;
  let execCommandMock: ReturnType<typeof vi.fn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    runtimeMessageListeners = [];
    portMessageListeners = [];

    Object.defineProperty(navigator, "platform", {
      value: "Win32",
      configurable: true,
    });

    Object.defineProperty(document, "hasFocus", {
      value: vi.fn(() => true),
      configurable: true,
    });

    execCommandMock = vi.fn(() => {
      const copyEvent = new Event("copy", { bubbles: true, cancelable: true }) as ClipboardEvent;
      Object.defineProperty(copyEvent, "clipboardData", {
        value: {
          setData: vi.fn(),
        },
      });
      document.dispatchEvent(copyEvent);
      return true;
    });

    Object.defineProperty(document, "execCommand", {
      value: execCommandMock,
      configurable: true,
    });

    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
    });

    infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    runtimeSendMessageMock = vi.fn();

    Object.assign(window, {
      VentrataInjector: undefined,
    });

    Object.assign(globalThis, {
      chrome: {
        runtime: {
          connect: vi.fn(() => ({
            onMessage: {
              addListener: vi.fn((listener: (message: unknown) => void) => {
                portMessageListeners.push(listener);
              }),
            },
            onDisconnect: {
              addListener: vi.fn(),
            },
          })),
          onMessage: {
            addListener: vi.fn((listener: (message: unknown) => void) => {
              runtimeMessageListeners.push(listener);
            }),
          },
          sendMessage: runtimeSendMessageMock,
        },
      },
    });

    await import("../src/ContentScript/index");
    await flushPromises();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    writeTextMock = vi.fn(async () => undefined);
    hasVentrataCheckoutScriptMock.mockReturnValue(false);

    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
    });

    execCommandMock = vi.fn(() => {
      const copyEvent = new Event("copy", { bubbles: true, cancelable: true }) as ClipboardEvent;
      Object.defineProperty(copyEvent, "clipboardData", {
        value: {
          setData: vi.fn(),
        },
      });
      document.dispatchEvent(copyEvent);
      return true;
    });

    Object.defineProperty(document, "execCommand", {
      value: execCommandMock,
      configurable: true,
    });

    infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    dispatchMouseEvent("mousedown", {
      button: 2,
      path: [document.body, document.documentElement, document],
    });
  });

  it("copies the captured checkout initial configuration when the runtime message arrives", async () => {
    const checkoutHost = document.createElement("ventrata-checkout-element");
    checkoutHost.setAttribute("data-initial-configuration", '{"env":"test"}');
    const originButton = document.createElement("button");
    checkoutHost.append(originButton);
    document.body.append(checkoutHost);

    dispatchMouseEvent("mousedown", {
      button: 2,
      path: [originButton, checkoutHost, document.body, document.documentElement, document],
    });

    runtimeMessageListeners[0]?.({
      name: "copy-checkout-configuration",
    });
    await flushPromises();

    expect(execCommandMock).toHaveBeenCalledWith("copy");
    expect(writeTextMock).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith("Ventrata Injector::configuration copied successfully");
  });

  it("skips copying when the last interaction was outside the checkout host", async () => {
    const regularDiv = document.createElement("div");
    document.body.append(regularDiv);

    dispatchMouseEvent("mousedown", {
      button: 2,
      path: [regularDiv, document.body, document.documentElement, document],
    });

    runtimeMessageListeners[0]?.({
      name: "copy-checkout-configuration",
    });
    await flushPromises();

    expect(execCommandMock).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(
      "Ventrata Injector::copy configuration skipped because the current interaction target was outside ventrata-checkout-element",
    );
  });

  it("copies immediately on ctrl+left click inside the checkout host", async () => {
    const checkoutHost = document.createElement("ventrata-checkout-element");
    checkoutHost.dataset.initialConfiguration = '{"env":"live"}';
    const originButton = document.createElement("button");
    checkoutHost.append(originButton);
    document.body.append(checkoutHost);

    const event = dispatchMouseEvent("mousedown", {
      button: 0,
      ctrlKey: true,
      path: [originButton, checkoutHost, document.body, document.documentElement, document],
    });
    await flushPromises();

    expect(event.defaultPrevented).toBe(false);
    expect(execCommandMock).toHaveBeenCalledWith("copy");
    expect(infoSpy).toHaveBeenCalledWith("Ventrata Injector::configuration copied successfully");
  });

  it("copies undefined when the checkout host has no initial configuration attribute", async () => {
    const checkoutHost = document.createElement("ventrata-checkout-element");
    const originButton = document.createElement("button");
    checkoutHost.append(originButton);
    document.body.append(checkoutHost);

    dispatchMouseEvent("contextmenu", {
      button: 2,
      path: [originButton, checkoutHost, document.body, document.documentElement, document],
    });

    runtimeMessageListeners[0]?.({
      name: "copy-checkout-configuration",
    });
    await flushPromises();

    expect(execCommandMock).toHaveBeenCalledWith("copy");
    expect(infoSpy).toHaveBeenCalledWith("Ventrata Injector::configuration copied successfully");
  });
});
