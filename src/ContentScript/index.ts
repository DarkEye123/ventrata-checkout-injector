import { AppName, type AppMessage, type CheckoutContextState } from "../types";
import {
  VENTRATA_CHECKOUT_ELEMENT_TAG,
  VENTRATA_PAGE_MARKER_ATTRIBUTES,
  hasVentrataPageMarkers,
} from "../checkoutMarkers";
import { hasVentrataCheckoutScript, injectScript } from "./helpers";

const IS_MAC_PLATFORM = (navigator.userAgentData?.platform ?? navigator.platform)
  .toLowerCase()
  .includes("mac");
const LEFT_MOUSE_BUTTON = 0;
const RIGHT_MOUSE_BUTTON = 2;

let latestCheckoutContextState: CheckoutContextState = {
  hasCheckoutContext: false,
};

function getOriginElement(path: EventTarget[]) {
  return path.find((node): node is HTMLElement => node instanceof HTMLElement);
}

function getCheckoutHostElement(path: EventTarget[]) {
  return path.find(
    (node): node is HTMLElement =>
      node instanceof HTMLElement && node.tagName.toLowerCase() === VENTRATA_CHECKOUT_ELEMENT_TAG,
  );
}

function getInitialConfigurationAttributeValue(checkoutHostElement: HTMLElement | undefined) {
  if (!checkoutHostElement) {
    return undefined;
  }

  return (
    checkoutHostElement.getAttribute("data-initial-configuration") ??
    checkoutHostElement.getAttribute("initial-configuration") ??
    checkoutHostElement.dataset.initialConfiguration
  );
}

function resolveCheckoutContextState(event: MouseEvent): CheckoutContextState {
  const composedPath = event.composedPath();
  const originElement = getOriginElement(composedPath);
  const checkoutHostElement = getCheckoutHostElement(composedPath);

  return {
    hasCheckoutContext: Boolean(checkoutHostElement),
    initialConfiguration: getInitialConfigurationAttributeValue(checkoutHostElement),
    originTagName: originElement?.tagName.toLowerCase(),
  };
}

function syncCheckoutContextState(state: CheckoutContextState) {
  latestCheckoutContextState = state;
}

function captureCheckoutContext(event: MouseEvent) {
  syncCheckoutContextState(resolveCheckoutContextState(event));
}

function isModifierShortcutCopyEvent(event: MouseEvent) {
  if (event.button !== LEFT_MOUSE_BUTTON) {
    return false;
  }

  return IS_MAC_PLATFORM ? event.metaKey : event.ctrlKey;
}

async function waitForDocumentFocus(timeoutMs = 500) {
  if (document.hasFocus()) {
    return true;
  }

  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => window.setTimeout(resolve, 25));

    if (document.hasFocus()) {
      return true;
    }
  }

  return document.hasFocus();
}

function writeToClipboardWithExecCommand(value: string) {
  let copied = false;

  const handleCopy = (event: ClipboardEvent) => {
    event.preventDefault();
    event.clipboardData?.setData("text/plain", value);
    copied = true;
  };

  document.addEventListener("copy", handleCopy, { once: true });

  try {
    const commandSucceeded = document.execCommand("copy");
    return copied && commandSucceeded;
  } finally {
    document.removeEventListener("copy", handleCopy);
  }
}

async function writeToClipboard(value: string) {
  const copiedWithExecCommand = writeToClipboardWithExecCommand(value);
  if (copiedWithExecCommand) {
    return;
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  throw new Error("Clipboard write failed");
}

async function copyLatestCheckoutConfiguration() {
  if (!latestCheckoutContextState.hasCheckoutContext) {
    console.info(
      "Ventrata Injector::copy configuration skipped because the current interaction target was outside ventrata-checkout-element",
    );
    return;
  }

  const originTagName = latestCheckoutContextState.originTagName ?? "unknown";
  const valueToCopy = latestCheckoutContextState.initialConfiguration;
  const clipboardValue = String(valueToCopy);

  console.log("Ventrata Injector::copy configuration origin", originTagName);

  try {
    await waitForDocumentFocus();
    await writeToClipboard(clipboardValue);
    console.info("Ventrata Injector::configuration copied successfully");
  } catch (error) {
    console.warn("Ventrata Injector::configuration copy failed", error);
  }
}

function messageHandler(message: AppMessage) {
  switch (message.name) {
    case "app-state": {
      if (message.payload.extensionIsActive) {
        injectScript(message.payload.appVersion, message.payload.checkoutScriptConfigOverrides);
      }
      break;
    }
    case "copy-checkout-configuration": {
      void copyLatestCheckoutConfiguration();
      break;
    }
    default: {
      console.warn("Ventrata Injector::unexpected content script message", message.name);
      break;
    }
  }
}

function syncCheckoutScriptPresence() {
  void chrome.runtime
    .sendMessage({
      name: "checkout-script-presence",
      payload: {
        hasCheckoutScript: hasVentrataCheckoutScript(),
      },
    } satisfies AppMessage)
    .catch(() => {
      // The service worker may not be ready yet; tab activation will re-sync menu visibility later.
    });
}

function observeCheckoutScriptPresence() {
  if (hasVentrataPageMarkers(document)) {
    return;
  }

  const observer = new MutationObserver(() => {
    if (!hasVentrataPageMarkers(document)) {
      return;
    }

    syncCheckoutScriptPresence();
    observer.disconnect();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", ...VENTRATA_PAGE_MARKER_ATTRIBUTES],
  });
}

function init() {
  if (!window.VentrataInjector?.contentScriptInjected) {
    console.log("Ventrata Injector::content script init");
    window.VentrataInjector = window.VentrataInjector
      ? { ...window.VentrataInjector, contentScriptInjected: true }
      : { contentScriptInjected: true };

    const port = chrome.runtime.connect({
      name: `${AppName.ContentScript}`,
    });

    console.log("Ventrata Injector::content script connected", port);
    syncCheckoutScriptPresence();
    observeCheckoutScriptPresence();

    chrome.runtime.onMessage.addListener((message: AppMessage) => {
      messageHandler(message);
    });

    window.addEventListener(
      "mousedown",
      (event) => {
        if (event.button === RIGHT_MOUSE_BUTTON) {
          captureCheckoutContext(event);
          return;
        }

        if (!isModifierShortcutCopyEvent(event)) {
          return;
        }

        captureCheckoutContext(event);

        if (!latestCheckoutContextState.hasCheckoutContext) {
          return;
        }

        void copyLatestCheckoutConfiguration();
      },
      true,
    );

    port.onMessage.addListener(messageHandler);

    port.onDisconnect.addListener(() => {
      console.log("Ventrata Injector::content script disconnected");
      window.VentrataInjector = window.VentrataInjector ?? {
        contentScriptInjected: false,
      };
      window.VentrataInjector.contentScriptInjected = false;
    });
  }
}

init();
