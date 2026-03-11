// @vitest-environment jsdom

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const injectScriptMock = vi.fn();

vi.mock("../src/ContentScript/helpers", async () => {
  const actual = await vi.importActual<typeof import("../src/ContentScript/helpers")>(
    "../src/ContentScript/helpers",
  );

  return {
    ...actual,
    injectScript: injectScriptMock,
  };
});

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
  let navigatorPlatformValue = "Win32";
  let userAgentDataPlatformValue: string | undefined;

  beforeAll(async () => {
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
  });

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    runtimeMessageListeners = [];
    portMessageListeners = [];
    document.body.innerHTML = "";
    writeTextMock = vi.fn(async () => undefined);

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
    runtimeSendMessageMock = vi.fn(async () => undefined);

    Object.defineProperty(navigator, "platform", {
      value: navigatorPlatformValue,
      configurable: true,
    });
    Object.defineProperty(navigator, "userAgentData", {
      value: userAgentDataPlatformValue ? { platform: userAgentDataPlatformValue } : undefined,
      configurable: true,
    });

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

  it("reports checkout script presence when a marker is added after init", async () => {
    const markerScript = document.createElement("script");
    markerScript.src = "https://cdn.checkout.ventrata.com/v3/pr/3118/ventrata-checkout.min.js";
    document.body.append(markerScript);
    await flushPromises();

    expect(runtimeSendMessageMock).toHaveBeenCalledWith({
      name: "checkout-script-presence",
      payload: {
        hasCheckoutScript: true,
      },
    });
  });

  it("reports checkout script presence when a script src becomes a checkout marker after insertion", async () => {
    const markerScript = document.createElement("script");
    document.body.append(markerScript);

    runtimeSendMessageMock.mockClear();

    markerScript.src = "https://cdn.checkout.ventrata.com/v3/pr/3118/ventrata-checkout.min.js";
    await flushPromises();

    expect(runtimeSendMessageMock).toHaveBeenCalledWith({
      name: "checkout-script-presence",
      payload: {
        hasCheckoutScript: true,
      },
    });
  });

  it("swallows checkout script presence message delivery failures during init", async () => {
    runtimeSendMessageMock.mockReset();
    runtimeSendMessageMock.mockRejectedValueOnce(new Error("No receiver"));

    vi.resetModules();
    Object.assign(window, {
      VentrataInjector: undefined,
    });

    await import("../src/ContentScript/index");
    await flushPromises();

    expect(runtimeSendMessageMock).toHaveBeenCalledWith({
      name: "checkout-script-presence",
      payload: {
        hasCheckoutScript: false,
      },
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("copies undefined when the checkout host has no initial configuration attribute", async () => {
    const checkoutHost = document.createElement("ventrata-checkout-element");
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
    expect(infoSpy).toHaveBeenCalledWith("Ventrata Injector::configuration copied successfully");
  });

  it("keeps the mousedown-captured checkout context even if a later contextmenu path is outside the host", async () => {
    const checkoutHost = document.createElement("ventrata-checkout-element");
    checkoutHost.setAttribute("data-initial-configuration", '{"env":"test"}');
    const originButton = document.createElement("button");
    checkoutHost.append(originButton);
    document.body.append(checkoutHost);

    const unrelatedDiv = document.createElement("div");
    document.body.append(unrelatedDiv);

    dispatchMouseEvent("mousedown", {
      button: 2,
      path: [originButton, checkoutHost, document.body, document.documentElement, document],
    });
    dispatchMouseEvent("contextmenu", {
      button: 2,
      path: [unrelatedDiv, document.body, document.documentElement, document],
    });

    runtimeMessageListeners[0]?.({
      name: "copy-checkout-configuration",
    });
    await flushPromises();

    expect(execCommandMock).toHaveBeenCalledWith("copy");
    expect(infoSpy).toHaveBeenCalledWith("Ventrata Injector::configuration copied successfully");
  });

  it("copies the legacy initial-configuration attribute value", async () => {
    const checkoutHost = document.createElement("ventrata-checkout-element");
    checkoutHost.setAttribute("initial-configuration", '{"env":"legacy"}');
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
    expect(infoSpy).toHaveBeenCalledWith("Ventrata Injector::configuration copied successfully");
  });

  describe("platform-specific shortcut handling", () => {
    beforeAll(() => {
      navigatorPlatformValue = "MacIntel";
      userAgentDataPlatformValue = "macOS";
    });

    afterAll(() => {
      navigatorPlatformValue = "Win32";
      userAgentDataPlatformValue = undefined;
    });

    it("uses meta-click when userAgentData reports a Mac platform", async () => {
      const checkoutHost = document.createElement("ventrata-checkout-element");
      checkoutHost.setAttribute("data-initial-configuration", '{"env":"mac"}');
      const originButton = document.createElement("button");
      checkoutHost.append(originButton);
      document.body.append(checkoutHost);

      dispatchMouseEvent("mousedown", {
        button: 0,
        metaKey: true,
        path: [originButton, checkoutHost, document.body, document.documentElement, document],
      });
      await flushPromises();

      expect(execCommandMock).toHaveBeenCalledWith("copy");
      expect(infoSpy).toHaveBeenCalledWith("Ventrata Injector::configuration copied successfully");
    });
  });

  describe("platform fallback shortcut handling", () => {
    beforeAll(() => {
      navigatorPlatformValue = "MacIntel";
      userAgentDataPlatformValue = undefined;
    });

    afterAll(() => {
      navigatorPlatformValue = "Win32";
      userAgentDataPlatformValue = undefined;
    });

    it("uses navigator.platform as the fallback Mac detection signal", async () => {
      const checkoutHost = document.createElement("ventrata-checkout-element");
      checkoutHost.setAttribute("data-initial-configuration", '{"env":"mac-fallback"}');
      const originButton = document.createElement("button");
      checkoutHost.append(originButton);
      document.body.append(checkoutHost);

      dispatchMouseEvent("mousedown", {
        button: 0,
        metaKey: true,
        path: [originButton, checkoutHost, document.body, document.documentElement, document],
      });
      await flushPromises();

      expect(execCommandMock).toHaveBeenCalledWith("copy");
      expect(infoSpy).toHaveBeenCalledWith("Ventrata Injector::configuration copied successfully");
    });
  });
});
