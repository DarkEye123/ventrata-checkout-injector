import { VENTRATA_CHECKOUT_ELEMENT_TAG } from "../checkoutMarkers";

const IS_MAC_PLATFORM = (navigator.userAgentData?.platform ?? navigator.platform)
  .toLowerCase()
  .includes("mac");
const LEFT_MOUSE_BUTTON = 0;
const RIGHT_MOUSE_BUTTON = 2;

let latestContextMenuInitialConfiguration: string | undefined;

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

  const initialConfiguration =
    checkoutHostElement.dataset.initialConfiguration ??
    checkoutHostElement.getAttribute("initial-configuration");

  return initialConfiguration ?? undefined;
}

function resolveCheckoutInitialConfiguration(event: MouseEvent) {
  return getInitialConfigurationAttributeValue(getCheckoutHostElement(event.composedPath()));
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

/**
 * Intentionally keeps copy behavior value-driven only. When no checkout configuration
 * is resolved, the function copies the literal string "undefined" instead of skipping.
 */
async function copyCheckoutConfigurationValue(initialConfiguration?: string) {
  try {
    await waitForDocumentFocus();
    await writeToClipboard(String(initialConfiguration));
    console.info("Ventrata Injector::configuration copied successfully");
  } catch (error) {
    console.warn("Ventrata Injector::configuration copy failed", error);
  }
}

function rememberContextMenuCheckoutConfiguration(event: MouseEvent) {
  if (event.button !== RIGHT_MOUSE_BUTTON) {
    return;
  }

  latestContextMenuInitialConfiguration = resolveCheckoutInitialConfiguration(event);
}

function handleModifierShortcutCopy(event: MouseEvent) {
  if (!isModifierShortcutCopyEvent(event)) {
    return false;
  }

  void copyCheckoutConfigurationValue(resolveCheckoutInitialConfiguration(event));
  return true;
}

function copyLatestCheckoutConfiguration() {
  void copyCheckoutConfigurationValue(latestContextMenuInitialConfiguration);
}

export {
  copyLatestCheckoutConfiguration,
  getInitialConfigurationAttributeValue,
  handleModifierShortcutCopy,
  rememberContextMenuCheckoutConfiguration,
  resolveCheckoutInitialConfiguration,
};
