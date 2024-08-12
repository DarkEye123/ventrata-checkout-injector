import { isPublicEnvironment, isTunneledEnvironment } from "../commonUtils";
import { ScriptReference } from "../types";

// ScriptReference is needed for dynamic ruleset
function injectScript(version?: string) {
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
    newScript.dataset.config = originalScript.dataset.config;
    // const originalConfiguration = JSON.parse(
    //   originalScript.dataset.config || "{}",
    // );
    // newScript.dataset.config = JSON.stringify({
    //   ...originalConfiguration,
    //   env: "test",
    // });
    // newScript.defer = true;

    newScript.src = newURL;

    document.body.appendChild(newScript);
    console.log("Injection Complete");
  }
}

export { injectScript };
