function injectScript() {
  const newURL =
    "https://cdn.checkout.ventrata.com/v3/staging/ventrata-checkout.min.js";

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
