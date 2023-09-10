import type { GenericMessage } from "../types";

interface InjectScriptMessage extends GenericMessage {
  name: "InjectScript";
  payload: {
    url: string; // app target version URL
  };
}

export { type InjectScriptMessage };
