<script lang="ts">
  import { onMount } from "svelte";
  import { AppName } from "../types";
  import type { Option } from "./types";
  import clsx from "clsx";

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

  chrome.runtime.onMessage.addListener((message) => {
    console.log("popup script message", message);
  });

  port.onMessage.addListener((message) => {
    console.log("popup port script message", message);
  });

  onMount(async () => {
    const activeTabs = await chrome.tabs.query({
      active: true,
    });
    activeTabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, "hello from popup");
      }
    });
  });

  function triggerScriptReload() {
    console.log("triggering");
    chrome.runtime.sendMessage({
      appVersion: selectedAppVersion,
      isActive: isAppOverloadActive,
    });
  }
</script>

<main class="grid gap-2">
  <h1>Ventrata Checkout Injector</h1>
  <section>
    <label>
      Checkout version:
      <select bind:value={selectedAppVersion} on:change={triggerScriptReload}>
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
        on:click={() => (isAppOverloadActive = !isAppOverloadActive)}
        >{isAppOverloadActive ? "enabled" : "disabled"}</button
      >
    </div>
  </footer>
</main>
