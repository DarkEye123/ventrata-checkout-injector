<script lang="ts">
  import { AppName, type AppMessage } from "../types";
  import type { Option } from "./types";
  import clsx from "clsx";
  import { sendSaveAppStateMessage, sendStateMessage } from "./helpers";
  import { fade } from "svelte/transition";
  import Checkmark from "./icons/Checkmark.svelte";

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
  let customAppVersion: number | null = null;
  let isAppOverloadActive = false;
  let saveTriggered = false;

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

  const handleOnVersionSelect = () => {
    if (selectedAppVersion !== String(customAppVersion)) {
      customAppVersion = null;
    }
    triggerAppStateUpdate();
  };

  const handleOnCustomAppVersionInput: (event: {
    currentTarget: HTMLInputElement;
  }) => void = ({ currentTarget }) => {
    if (String(customAppVersion) !== currentTarget.value) {
      customAppVersion = Number(currentTarget.value);
      triggerAppStateUpdate();
    }
  };

  const triggerAppStateUpdate = () => {
    const prefixedCustomAppVersion = customAppVersion
      ? `pr/${customAppVersion}`
      : null;
    sendStateMessage(port, {
      appVersion: prefixedCustomAppVersion || selectedAppVersion,
      isActive: isAppOverloadActive,
    });
  };

  const handleAppConfigurationSave = () => {
    saveTriggered = true;
    setTimeout(() => {
      saveTriggered = false;
    }, 1000); // visual UX feedback

    sendSaveAppStateMessage(port);
  };
</script>

<main class="grid gap-6">
  <h1>Ventrata Checkout Injector</h1>
  <div class="grid gap-6 rounded-lg border border-gray-200 p-4">
    <section class="grid justify-items-center gap-2">
      <label for="appVersionSelect"> Checkout version </label>
      <select
        id="appVersionSelect"
        bind:value={selectedAppVersion}
        on:change={handleOnVersionSelect}
        class="w-3/4"
      >
        {#each SupportedAppTargetVersions as { value, text }}
          <option {value}> {text}</option>
        {/each}
      </select>
    </section>
    <h2 class="text-2xl font-bold">— OR —</h2>
    <section>
      <label>
        set your PR version manually
        <input
          type="number"
          on:blur={handleOnCustomAppVersionInput}
          on:keydown={(event) => {
            if (event.key === "Enter") {
              handleOnCustomAppVersionInput(event);
            }
          }}
        />
      </label>
    </section>
  </div>
  <footer class="grid gap-4">
    <div class="flex items-center justify-between">
      <button
        class={clsx("w-full", {
          "bg-green-200": isAppOverloadActive,
          "bg-red-200": !isAppOverloadActive,
        })}
        on:click={() => {
          isAppOverloadActive = !isAppOverloadActive;
          triggerAppStateUpdate();
        }}
        ><span>Extension is:</span><span class="ml-4 text-lg font-bold"
          >{isAppOverloadActive ? "enabled" : "disabled"}</span
        ></button
      >
    </div>
    <div class="relative grid gap-4">
      <button on:click={handleAppConfigurationSave}
        >{saveTriggered ? "Configuration Saved" : "Save configuration"}</button
      >
      {#if saveTriggered}
        <div
          transition:fade
          class="absolute bottom-1/2 right-2 h-4 w-4 translate-y-1/2"
        >
          <Checkmark></Checkmark>
        </div>
      {/if}
    </div>
  </footer>
</main>
