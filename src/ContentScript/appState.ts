import type { AppStateMessage } from "../types";
import { injectScript } from "./helpers";

function handleAppStateMessage(message: AppStateMessage) {
  if (!message.payload.extensionIsActive) {
    return;
  }

  injectScript(message.payload.appVersion, message.payload.checkoutScriptConfigOverrides);
}

export { handleAppStateMessage };
