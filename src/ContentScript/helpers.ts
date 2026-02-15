import { isPublicEnvironment, isTunneledEnvironment } from "../commonUtils";
import { ScriptReference, type CheckoutScriptConfigOverrides } from "../types";

// ScriptReference is needed for dynamic ruleset
function injectScript(
  version?: string,
  checkoutScriptConfigOverrides?: CheckoutScriptConfigOverrides,
) {
  let inclusionPath = version ?? "staging"; // just try for quick comparison reference pr/451
  inclusionPath = isPublicEnvironment(inclusionPath)
    ? inclusionPath
    : `pr/${inclusionPath}`;
  const newURL = isTunneledEnvironment(inclusionPath)
    ? `${inclusionPath}${ScriptReference}`
    : `https://cdn.checkout.ventrata.com/v3/${inclusionPath}/ventrata-checkout.min.js${ScriptReference}`;
  // const newURL = `https://laboratory.eu.ngrok.io/ventrata-checkout.min.js${ScriptReference}`;

  const originalScript = document.querySelector(
    'script[src="https://cdn.checkout.ventrata.com/v3/production/ventrata-checkout.min.js"]',
  ) as HTMLScriptElement;

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
    const resolvedEnv =
      checkoutScriptConfigOverrides?.env === "test" ? "test" : "live";
    newScript.dataset.config = JSON.stringify({
      ...parsedConfig,
      ...(checkoutScriptConfigOverrides ?? {}),
      env: resolvedEnv,
    });
    // newScript.defer = true;

    originalScript.remove();
    newScript.src = newURL;

    document.body.appendChild(newScript);
    console.log("Injection Complete");
  }
}

export { injectScript };
