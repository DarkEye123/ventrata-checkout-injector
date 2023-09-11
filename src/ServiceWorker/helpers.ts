async function unregisterAllDynamicContentScripts() {
  try {
    const scripts = await chrome.scripting.getRegisteredContentScripts();
    const scriptIds = scripts.map((script) => script);
    console.log(scriptIds);
    // return chrome.scripting.unregisterContentScripts(scriptIds);
  } catch (error) {
    const message = [
      "An unexpected error occurred while",
      "unregistering dynamic content scripts.",
    ].join(" ");
    throw new Error(message, { cause: error });
  }
}

export { unregisterAllDynamicContentScripts };
