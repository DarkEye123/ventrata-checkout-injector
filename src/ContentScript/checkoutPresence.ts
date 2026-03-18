import { VENTRATA_PAGE_MARKER_ATTRIBUTES, hasVentrataPageMarkers } from "../checkoutMarkers";
import type { AppMessage } from "../types";
import { hasVentrataCheckoutScript } from "./helpers";

let checkoutPresenceObserver: MutationObserver | null = null;

function syncCheckoutScriptPresence() {
  void chrome.runtime
    .sendMessage({
      name: "checkout-script-presence",
      payload: {
        hasCheckoutScript: hasVentrataCheckoutScript(),
      },
    } satisfies AppMessage)
    .catch(() => {
      // The service worker may not be ready yet; the content script will report later.
    });
}

function observeCheckoutScriptPresence() {
  if (hasVentrataPageMarkers(document)) {
    checkoutPresenceObserver?.disconnect();
    checkoutPresenceObserver = null;
    return;
  }

  if (checkoutPresenceObserver) {
    return;
  }

  checkoutPresenceObserver = new MutationObserver(() => {
    if (!hasVentrataPageMarkers(document)) {
      return;
    }

    syncCheckoutScriptPresence();
    checkoutPresenceObserver?.disconnect();
    checkoutPresenceObserver = null;
  });

  checkoutPresenceObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", ...VENTRATA_PAGE_MARKER_ATTRIBUTES],
  });
}

function initCheckoutPresenceSync() {
  syncCheckoutScriptPresence();
  observeCheckoutScriptPresence();
}

export { initCheckoutPresenceSync };
