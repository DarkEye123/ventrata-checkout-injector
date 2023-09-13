<script lang="ts">
  import { AppName, type AppMessage } from "../types";
  import type { Option } from "./types";
  import clsx from "clsx";
  import { sendStateMessage } from "./helpers";

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
  };
</script>

<main class="grid gap-2">
  <h1>Ventrata Checkout Injector</h1>
  <section>
    <label>
      Checkout version:
      <select bind:value={selectedAppVersion} on:change={handleOnVersionSelect}>
        {#each SupportedAppTargetVersions as { value, text }}
          <option {value}> {text}</option>
        {/each}
      </select>
    </label>
  </section>
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
    <div class="grid grid-cols-2">
      <button on:click={handleAppConfigurationSave}>Save configuration</button>
      <div
        class={clsx("animate-ping", {
          visible: saveTriggered,
          invisible: !saveTriggered,
        })}
      >
        Configuration saved!
      </div>
    </div>
  </footer>
</main>
