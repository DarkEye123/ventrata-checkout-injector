import "./app.css";
import Popup from "./index.svelte";

const rootElement = document.getElementById("app");
let app: Popup | null = null;

if (rootElement) {
  app = new Popup({
    target: rootElement,
  });
}

export default app;
