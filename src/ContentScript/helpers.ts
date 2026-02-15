import { isPublicEnvironment, isTunneledEnvironment } from "../commonUtils";
import { ScriptReference, type CheckoutScriptConfigOverrides } from "../types";

const CHECKOUT_SCRIPT_PATH = "/v3/production/ventrata-checkout.min.js";
const INJECTOR_REF_PARAM_KEY = "ref";
const INJECTOR_REF_PARAM_VALUE = "ventrata-injector-extension";
const PAGE_HOOK_MESSAGE_TYPE = "ventrata-injector:apply-overrides";
let originalScriptCleanupObserver: MutationObserver | undefined;

function getScriptUrl(script: HTMLScriptElement) {
  try {
    return new URL(script.src, window.location.href);
  } catch {
    return null;
  }
}

function isOriginalCheckoutScript(script: HTMLScriptElement) {
  const scriptUrl = getScriptUrl(script);
  if (!scriptUrl) {
    return false;
  }
  const isCheckoutProductionScript =
    scriptUrl.pathname.endsWith(CHECKOUT_SCRIPT_PATH);
  const hasInjectorRef =
    scriptUrl.searchParams.get(INJECTOR_REF_PARAM_KEY) ===
    INJECTOR_REF_PARAM_VALUE;
  return isCheckoutProductionScript && !hasInjectorRef;
}

function removeOriginalScriptsFromElement(element: Element) {
  if (
    element instanceof HTMLScriptElement &&
    isOriginalCheckoutScript(element)
  ) {
    element.remove();
  }
  const nestedScripts = Array.from(
    element.querySelectorAll("script[src]"),
  ) as HTMLScriptElement[];
  nestedScripts
    .filter((nestedScript) => isOriginalCheckoutScript(nestedScript))
    .forEach((nestedScript) => nestedScript.remove());
}

function setOriginalScriptCleanupEnabled(enabled: boolean) {
  if (!enabled) {
    originalScriptCleanupObserver?.disconnect();
    originalScriptCleanupObserver = undefined;
    return;
  }

  if (originalScriptCleanupObserver || !document.documentElement) {
    return;
  }

  originalScriptCleanupObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((addedNode) => {
          if (addedNode instanceof Element) {
            removeOriginalScriptsFromElement(addedNode);
          }
        });
        return;
      }

      if (mutation.type === "attributes") {
        const target = mutation.target;
        if (
          target instanceof HTMLScriptElement &&
          isOriginalCheckoutScript(target)
        ) {
          target.remove();
        }
      }
    });
  });

  originalScriptCleanupObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src"],
  });
}

function resolveCheckoutScriptConfigOverrides(
  checkoutScriptConfigOverrides?: CheckoutScriptConfigOverrides,
): CheckoutScriptConfigOverrides {
  return {
    ...(checkoutScriptConfigOverrides ?? {}),
    env: checkoutScriptConfigOverrides?.env === "test" ? "test" : "live",
  };
}

function applyProgrammaticOverridesInMainWorld(
  checkoutScriptConfigOverrides: CheckoutScriptConfigOverrides,
) {
  window.postMessage(
    {
      type: PAGE_HOOK_MESSAGE_TYPE,
      payload: {
        checkoutScriptConfigOverrides,
      },
    },
    "*",
  );
}

// ScriptReference is needed for dynamic ruleset
function injectScript(
  version?: string,
  checkoutScriptConfigOverrides?: CheckoutScriptConfigOverrides,
) {
  setOriginalScriptCleanupEnabled(true);
  const resolvedCheckoutScriptConfigOverrides = resolveCheckoutScriptConfigOverrides(
    checkoutScriptConfigOverrides,
  );

  let inclusionPath = version ?? "staging"; // just try for quick comparison reference pr/451
  inclusionPath = isPublicEnvironment(inclusionPath)
    ? inclusionPath
    : `pr/${inclusionPath}`;
  const newURL = isTunneledEnvironment(inclusionPath)
    ? `${inclusionPath}${ScriptReference}`
    : `https://cdn.checkout.ventrata.com/v3/${inclusionPath}/ventrata-checkout.min.js${ScriptReference}`;
  // const newURL = `https://laboratory.eu.ngrok.io/ventrata-checkout.min.js${ScriptReference}`;

  const scripts = Array.from(
    document.querySelectorAll("script[src]"),
  ) as HTMLScriptElement[];
  const originalScripts = scripts.filter(isOriginalCheckoutScript);
  const originalScript = originalScripts[0];

  if (originalScript) {
    const newScript = document.createElement("script");

    newScript.type = "module";
    const originalConfigurationRaw = originalScript.dataset.config;
    let parsedConfig: Record<string, unknown> = {};
    if (originalConfigurationRaw) {
      try {
        parsedConfig = JSON.parse(originalConfigurationRaw);
      } catch (error) {
        console.warn(
          "Failed to parse original script config, fallback to extension config only",
          error,
        );
      }
    }
    newScript.dataset.config = JSON.stringify({
      ...parsedConfig,
      ...resolvedCheckoutScriptConfigOverrides,
    });
    // newScript.defer = true;

    originalScripts.forEach((script) => script.remove());
    newScript.src = newURL;
    newScript.addEventListener("load", () => {
      applyProgrammaticOverridesInMainWorld(
        resolvedCheckoutScriptConfigOverrides,
      );
    });
    newScript.addEventListener("error", () => {
      console.warn(
        "Ventrata Injector::checkout script failed to load, skipping programmatic wrapper",
      );
    });

    document.body.appendChild(newScript);
    console.log("Injection Complete");
  }
}

export { injectScript };
export { setOriginalScriptCleanupEnabled };
