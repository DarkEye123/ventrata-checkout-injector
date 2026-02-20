type CheckoutScriptConfigOverrides = {
  env: "live" | "test";
  [key: string]: unknown;
};

type VentrataFn = ((config?: Record<string, unknown>, ...args: unknown[]) => unknown) & {
  __ventrataInjectorOriginal?: VentrataFn;
};

type ApplyOverridesMessage = {
  type: "ventrata-injector:apply-overrides";
  payload?: {
    checkoutScriptConfigOverrides?: CheckoutScriptConfigOverrides;
  };
};

const PAGE_HOOK_MESSAGE_TYPE = "ventrata-injector:apply-overrides";
const PAGE_HOOK_INIT_KEY = "__ventrataInjectorPageHookInitialized";

type WindowWithPageHookFlag = Window & {
  [PAGE_HOOK_INIT_KEY]?: boolean;
};

let currentOverrides: CheckoutScriptConfigOverrides = {
  env: "live",
};

function resolveCheckoutScriptConfigOverrides(
  checkoutScriptConfigOverrides?: CheckoutScriptConfigOverrides,
): CheckoutScriptConfigOverrides {
  return {
    ...(checkoutScriptConfigOverrides ?? {}),
    env: checkoutScriptConfigOverrides?.env === "test" ? "test" : "live",
  };
}

function wrapProgrammaticVentrata() {
  if (typeof window.Ventrata !== "function") {
    return;
  }

  const currentVentrata = window.Ventrata as VentrataFn;
  const originalVentrata = currentVentrata.__ventrataInjectorOriginal ?? currentVentrata;

  const wrappedVentrata: VentrataFn = function (this: unknown, config, ...args) {
    const configObject = config && typeof config === "object" ? config : {};
    return originalVentrata.call(
      this,
      {
        ...configObject,
        ...currentOverrides,
      },
      ...args,
    );
  };

  wrappedVentrata.__ventrataInjectorOriginal = originalVentrata;
  window.Ventrata = wrappedVentrata;
}

function handleOverrideMessage(event: MessageEvent<ApplyOverridesMessage>) {
  if (event.source !== window) {
    return;
  }
  if (!event.data || event.data.type !== PAGE_HOOK_MESSAGE_TYPE) {
    return;
  }

  currentOverrides = resolveCheckoutScriptConfigOverrides(
    event.data.payload?.checkoutScriptConfigOverrides,
  );
  wrapProgrammaticVentrata();
}

const globalWindow = window as WindowWithPageHookFlag;
if (!globalWindow[PAGE_HOOK_INIT_KEY]) {
  window.addEventListener("message", handleOverrideMessage);
  globalWindow[PAGE_HOOK_INIT_KEY] = true;
}
