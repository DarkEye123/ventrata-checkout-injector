import { ScriptReference } from "../types";

// ?ref=ventrata-injector-extension is needed for dynamic ruleset
function injectScript(url?: string) {
  const newURL =
    `${url}${ScriptReference}` ||
    `https://cdn.checkout.ventrata.com/v3/staging/ventrata-checkout.min.js${ScriptReference}`;

  const originalScript = document.querySelector(
    'script[src="https://cdn.checkout.ventrata.com/v3/production/ventrata-checkout.min.js"]'
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
