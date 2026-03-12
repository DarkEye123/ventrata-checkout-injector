// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const injectScriptMock = vi.fn();

vi.mock("./helpers", () => ({
  injectScript: injectScriptMock,
}));

describe("handleAppStateMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("injects the requested script when the extension is active", async () => {
    const { handleAppStateMessage } = await import("./appState");

    handleAppStateMessage({
      name: "app-state",
      payload: {
        extensionIsActive: true,
        checkoutScriptConfigOverrides: { env: "test", foo: "bar" },
        appVersion: "production",
      },
    });

    expect(injectScriptMock).toHaveBeenCalledWith("production", { env: "test", foo: "bar" });
  });

  it("does nothing when the extension is inactive", async () => {
    const { handleAppStateMessage } = await import("./appState");

    handleAppStateMessage({
      name: "app-state",
      payload: {
        extensionIsActive: false,
        checkoutScriptConfigOverrides: { env: "live" },
        appVersion: "staging",
      },
    });

    expect(injectScriptMock).not.toHaveBeenCalled();
  });
});
