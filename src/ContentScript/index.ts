import { AppName, type AppMessage, type CheckoutContextState } from "../types";
import { injectScript } from "./helpers";

const VENTRATA_CHECKOUT_ELEMENT_TAG = "ventrata-checkout-element";

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

function resolveCheckoutContextState(event: MouseEvent): CheckoutContextState {
  const composedPath = event.composedPath();
  const originElement = getOriginElement(composedPath);
  const checkoutHostElement = getCheckoutHostElement(composedPath);

  return {
    hasCheckoutContext: Boolean(checkoutHostElement),
    initialConfiguration: checkoutHostElement?.dataset.initialConfiguration,
    originTagName: originElement?.tagName.toLowerCase(),
  };
}

function syncCheckoutContextState(state: CheckoutContextState) {
  latestCheckoutContextState = state;
}

async function writeToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();

  try {
    document.execCommand("copy");
  } finally {
    textArea.remove();
  }
}

async function copyLatestCheckoutConfiguration() {
  if (!latestCheckoutContextState.hasCheckoutContext) {
    console.info(
      "Ventrata Injector::copy configuration skipped because the last right click was outside ventrata-checkout-element",
    );
    return;
  }

  const originTagName = latestCheckoutContextState.originTagName ?? "unknown";
  const valueToCopy = String(latestCheckoutContextState.initialConfiguration);

  console.log("Ventrata Injector::copy configuration origin", originTagName);
  await writeToClipboard(valueToCopy);
  console.info("Ventrata Injector::configuration copied successfully");
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

    chrome.runtime.onMessage.addListener((message: AppMessage) => {
      messageHandler(message);
    });

    window.addEventListener("contextmenu", (event) => {
      syncCheckoutContextState(resolveCheckoutContextState(event));
    });

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
