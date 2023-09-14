<script lang="ts">
  import { AppName, type AppMessage } from "../types";
  import type { Option } from "./types";
  import { sendSaveAppStateMessage, sendStateMessage } from "./helpers";
  import { Button, Switch } from "@svelteuidev/core";
  import { Backpack } from "radix-icons-svelte";

  const Staging = "staging";
  const Production = "production";

  const SupportedAppTargetVersions: Option[] = [
    {
      value: Staging,
      text: "Staging",
    },
    {
      value: Production,
      text: "Production",
    },
  ];

  let selectedAppVersion: string = SupportedAppTargetVersions[0].value;
  let customAppVersion: number | null = null;
  let isAppOverloadActive = false;
  let saveTriggered = false;
  let customAppVersionInput: HTMLInputElement;

  const port = chrome.runtime.connect({
    name: `${AppName.Popup}`,
  });

  port.onMessage.addListener((message: AppMessage) => {
    console.log("popup port script message", message);
    switch (message.name) {
      case "app-state": {
        if (
          message.payload.appVersion.startsWith("pr") &&
          message.payload.appVersion !== Production
        ) {
          const versionPart = message.payload.appVersion.split("/")[1];
          customAppVersion = Number(versionPart);
          customAppVersionInput.value = versionPart;
          selectedAppVersion = "";
        } else {
          selectedAppVersion = message.payload.appVersion;
        }
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
      customAppVersionInput.value = "";
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
          bind:this={customAppVersionInput}
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
    <Switch
      class="justify-self-center"
      size="md"
      onLabel="ON"
      offLabel="OFF"
      color="green"
      label="Extension"
      checked={isAppOverloadActive}
      on:change={() => {
        isAppOverloadActive = !isAppOverloadActive;
        triggerAppStateUpdate();
      }}
    />

    <Button
      on:click={handleAppConfigurationSave}
      variant="light"
      color="gray"
      ripple
      fullSize
      loading={saveTriggered}
    >
      <Backpack slot="leftIcon" />
      {saveTriggered ? "Saving..." : "Save configuration"}
    </Button>
  </footer>
</main>
