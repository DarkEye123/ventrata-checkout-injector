// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("checkout presence sync", () => {
  let runtimeSendMessageMock: ReturnType<typeof vi.fn>;
  const OriginalMutationObserver = globalThis.MutationObserver;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    document.body.innerHTML = "";
    globalThis.MutationObserver = OriginalMutationObserver;
    runtimeSendMessageMock = vi.fn(async () => undefined);

    Object.assign(globalThis, {
      chrome: {
        runtime: {
          sendMessage: runtimeSendMessageMock,
        },
      },
    });
  });

  it("reports initial absence and later reports presence when a marker appears", async () => {
    const { initCheckoutPresenceSync } = await import("./checkoutPresence");

    initCheckoutPresenceSync();

    expect(runtimeSendMessageMock).toHaveBeenCalledWith({
      name: "checkout-script-presence",
      payload: {
        hasCheckoutScript: false,
      },
    });

    runtimeSendMessageMock.mockClear();

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

  it("swallows initial sendMessage failures", async () => {
    runtimeSendMessageMock.mockRejectedValueOnce(new Error("No receiver"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { initCheckoutPresenceSync } = await import("./checkoutPresence");

    initCheckoutPresenceSync();
    await flushPromises();

    expect(runtimeSendMessageMock).toHaveBeenCalledWith({
      name: "checkout-script-presence",
      payload: {
        hasCheckoutScript: false,
      },
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("does not register duplicate observers across repeated init calls", async () => {
    const observeMock = vi.fn();
    const disconnectMock = vi.fn();
    const mutationObserverConstructorMock = vi.fn(function (this: MutationObserver) {
      return {
        observe: observeMock,
        disconnect: disconnectMock,
      };
    });

    globalThis.MutationObserver =
      mutationObserverConstructorMock as unknown as typeof MutationObserver;

    const { initCheckoutPresenceSync } = await import("./checkoutPresence");

    initCheckoutPresenceSync();
    initCheckoutPresenceSync();

    expect(runtimeSendMessageMock).toHaveBeenCalledTimes(2);
    expect(mutationObserverConstructorMock).toHaveBeenCalledTimes(1);
    expect(observeMock).toHaveBeenCalledTimes(1);
    expect(disconnectMock).not.toHaveBeenCalled();
  });
});
