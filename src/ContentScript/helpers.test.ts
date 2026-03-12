// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

describe("content script helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("detects checkout markers on the page", async () => {
    const { hasVentrataCheckoutScript } = await import("./helpers");
    const checkoutHost = document.createElement("ventrata-checkout-element");
    document.body.append(checkoutHost);

    expect(hasVentrataCheckoutScript()).toBe(true);
  });

  it("replaces the original checkout script and merges original config with overrides", async () => {
    const postMessageSpy = vi.spyOn(window, "postMessage").mockImplementation(() => undefined);
    const { injectScript } = await import("./helpers");
    const originalScript = document.createElement("script");
    originalScript.src = "https://cdn.checkout.ventrata.com/v3/production/ventrata-checkout.min.js";
    originalScript.dataset.config = '{"foo":"bar","env":"live"}';
    document.body.append(originalScript);

    injectScript("production", { env: "test", feature: true });

    const newScript = document.body.querySelector("script[src]") as HTMLScriptElement | null;

    expect(document.body.contains(originalScript)).toBe(false);
    expect(newScript?.src).toContain(
      "https://cdn.checkout.ventrata.com/v3/production/ventrata-checkout.min.js?ref=ventrata-injector-extension",
    );
    expect(JSON.parse(newScript?.dataset.config ?? "{}")).toEqual({
      foo: "bar",
      env: "test",
      feature: true,
    });

    newScript?.dispatchEvent(new Event("load"));

    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        type: "ventrata-injector:apply-overrides",
        payload: {
          checkoutScriptConfigOverrides: {
            env: "test",
            feature: true,
          },
        },
      },
      "*",
    );
  });

  it("falls back to extension overrides when original data-config is invalid", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { injectScript } = await import("./helpers");
    const originalScript = document.createElement("script");
    originalScript.src = "https://cdn.checkout.ventrata.com/v3/production/ventrata-checkout.min.js";
    originalScript.dataset.config = "{";
    document.body.append(originalScript);

    injectScript("staging", { env: "live", feature: "only-extension" });

    const newScript = document.body.querySelector("script[src]") as HTMLScriptElement | null;

    expect(JSON.parse(newScript?.dataset.config ?? "{}")).toEqual({
      env: "live",
      feature: "only-extension",
    });
    expect(warnSpy).toHaveBeenCalledWith(
      "Failed to parse original script config, fallback to extension config only",
      expect.any(SyntaxError),
    );
  });
});
