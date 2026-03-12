// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

function dispatchMouseEvent(options: MouseEventInit & { path: EventTarget[] }) {
  const event = new MouseEvent("mousedown", {
    bubbles: true,
    cancelable: true,
    button: options.button,
    ctrlKey: options.ctrlKey,
    metaKey: options.metaKey,
  });

  Object.defineProperty(event, "composedPath", {
    value: () => options.path,
  });

  return event;
}

async function importCopyModule(platform = "Win32", userAgentDataPlatform?: string) {
  vi.resetModules();

  Object.defineProperty(navigator, "platform", {
    value: platform,
    configurable: true,
  });
  Object.defineProperty(navigator, "userAgentData", {
    value: userAgentDataPlatform ? { platform: userAgentDataPlatform } : undefined,
    configurable: true,
  });

  return import("./copyCheckoutConfiguration");
}

describe("copy checkout configuration", () => {
  let writeTextMock: ReturnType<typeof vi.fn>;
  let execCommandMock: ReturnType<typeof vi.fn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";

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

    writeTextMock = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
    });

    infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("copies the remembered right-click configuration", async () => {
    const { rememberContextMenuCheckoutConfiguration, copyLatestCheckoutConfiguration } =
      await importCopyModule();

    const checkoutHost = document.createElement("ventrata-checkout-element");
    checkoutHost.dataset.initialConfiguration = '{"env":"test"}';
    const originButton = document.createElement("button");
    checkoutHost.append(originButton);
    document.body.append(checkoutHost);

    rememberContextMenuCheckoutConfiguration(
      dispatchMouseEvent({
        button: 2,
        path: [originButton, checkoutHost, document.body, document.documentElement, document],
      }),
    );

    copyLatestCheckoutConfiguration();
    await flushPromises();

    expect(execCommandMock).toHaveBeenCalledWith("copy");
    expect(writeTextMock).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith("Ventrata Injector::configuration copied successfully");
  });

  it("copies undefined when the remembered target is outside checkout", async () => {
    const { rememberContextMenuCheckoutConfiguration, copyLatestCheckoutConfiguration } =
      await importCopyModule();
    const regularDiv = document.createElement("div");
    document.body.append(regularDiv);

    rememberContextMenuCheckoutConfiguration(
      dispatchMouseEvent({
        button: 2,
        path: [regularDiv, document.body, document.documentElement, document],
      }),
    );

    copyLatestCheckoutConfiguration();
    await flushPromises();

    expect(execCommandMock).toHaveBeenCalledWith("copy");
    expect(infoSpy).toHaveBeenCalledWith("Ventrata Injector::configuration copied successfully");
  });

  it("copies immediately on ctrl+left click on non-mac platforms", async () => {
    const { handleModifierShortcutCopy } = await importCopyModule();
    const checkoutHost = document.createElement("ventrata-checkout-element");
    checkoutHost.dataset.initialConfiguration = '{"env":"live"}';
    const originButton = document.createElement("button");
    checkoutHost.append(originButton);
    document.body.append(checkoutHost);

    const handled = handleModifierShortcutCopy(
      dispatchMouseEvent({
        button: 0,
        ctrlKey: true,
        path: [originButton, checkoutHost, document.body, document.documentElement, document],
      }),
    );
    await flushPromises();

    expect(handled).toBe(true);
    expect(execCommandMock).toHaveBeenCalledWith("copy");
  });

  it("uses meta+left click on mac platforms", async () => {
    const { handleModifierShortcutCopy } = await importCopyModule("MacIntel", "macOS");
    const checkoutHost = document.createElement("ventrata-checkout-element");
    checkoutHost.dataset.initialConfiguration = '{"env":"mac"}';
    const originButton = document.createElement("button");
    checkoutHost.append(originButton);
    document.body.append(checkoutHost);

    const handled = handleModifierShortcutCopy(
      dispatchMouseEvent({
        button: 0,
        metaKey: true,
        path: [originButton, checkoutHost, document.body, document.documentElement, document],
      }),
    );
    await flushPromises();

    expect(handled).toBe(true);
    expect(execCommandMock).toHaveBeenCalledWith("copy");
  });

  it("reads the legacy initial-configuration attribute", async () => {
    const { resolveCheckoutInitialConfiguration } = await importCopyModule();
    const checkoutHost = document.createElement("ventrata-checkout-element");
    checkoutHost.setAttribute("initial-configuration", '{"env":"legacy"}');
    const originButton = document.createElement("button");
    checkoutHost.append(originButton);
    document.body.append(checkoutHost);

    const configuration = resolveCheckoutInitialConfiguration(
      dispatchMouseEvent({
        button: 2,
        path: [originButton, checkoutHost, document.body, document.documentElement, document],
      }),
    );

    expect(configuration).toBe('{"env":"legacy"}');
  });

  it("falls back to navigator.clipboard when execCommand does not complete the copy", async () => {
    execCommandMock.mockReturnValue(false);
    const { copyLatestCheckoutConfiguration } = await importCopyModule();

    copyLatestCheckoutConfiguration();
    await flushPromises();

    expect(writeTextMock).toHaveBeenCalledWith("undefined");
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
