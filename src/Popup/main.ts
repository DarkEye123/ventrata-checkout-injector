import "./app.css";
import Popup from "./index.svelte";

const app = new Popup({
  target: document.getElementById("app"),
});

export default app;
