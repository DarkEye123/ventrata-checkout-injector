<script lang="ts">
  import { onMount } from "svelte";
  import { AppName, type AppMessage } from "../types";
  import type { Option } from "./types";
  import clsx from "clsx";
  import { sendMessage } from "./helpers";

  const SupportedAppTargetVersions: Option[] = [
    {
      value: "staging",
      text: "Staging",
    },
    {
      value: "production",
      text: "Production",
    },
  ];

  let selectedAppVersion = SupportedAppTargetVersions[0].value;
  let isAppOverloadActive = false;

  let currentlyActiveScript = document.querySelector(
    'script[src="ventrata-checkout.min.js"]'
  ) as HTMLScriptElement;

  const port = chrome.runtime.connect({
    name: `${AppName.Popup}`,
  });

  port.onMessage.addListener((message: AppMessage) => {
    console.log("popup port script message", message);
    switch (message.name) {
      case "app-state": {
        selectedAppVersion = message.payload.appVersion;
        isAppOverloadActive = message.payload.isActive;
        break;
      }
      default: {
        console.error("unknown message detected");
      }
    }
  });

  function triggerAppStateUpdate() {
    sendMessage(port, {
      name: "app-state",
      payload: {
        appVersion: selectedAppVersion,
        isActive: isAppOverloadActive,
      },
    });
  }
</script>

<main class="grid gap-2">
  <h1>Ventrata Checkout Injector</h1>
  <section>
    <label>
      Checkout version:
      <select bind:value={selectedAppVersion} on:change={triggerAppStateUpdate}>
        {#each SupportedAppTargetVersions as { value, text }}
          <option {value}> {text}</option>
        {/each}
      </select>
    </label>
  </section>
  <section>
    currently detected script: {currentlyActiveScript?.src}
  </section>
  <footer>
    <div>
      <span>Extension is:</span>
      <button
        class={clsx({
          "bg-green-200": isAppOverloadActive,
          "bg-red-200": !isAppOverloadActive,
        })}
        on:click={() => {
          isAppOverloadActive = !isAppOverloadActive;
          triggerAppStateUpdate();
        }}>{isAppOverloadActive ? "enabled" : "disabled"}</button
      >
    </div>
  </footer>
</main>
