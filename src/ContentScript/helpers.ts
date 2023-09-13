import { ScriptReference } from "../types";

// ScriptReference is needed for dynamic ruleset
function injectScript(version?: string) {
  const _version = version ?? "staging"; // just try for quick comparison reference pr/451
  const newURL = `https://cdn.checkout.ventrata.com/v3/${_version}/ventrata-checkout.min.js${ScriptReference}`;

  const originalScript = document.querySelector(
    'script[src="https://cdn.checkout.ventrata.com/v3/production/ventrata-checkout.min.js"]',
  ) as HTMLScriptElement;

  if (originalScript) {
    const newScript = document.createElement("script");

    newScript.type = "module";
    newScript.dataset.config = originalScript.dataset.config;

    newScript.src = newURL;

    document.body.appendChild(newScript);
    console.log("Injection Complete");
  }
}

export { injectScript };
