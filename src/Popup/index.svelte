<script lang="ts">
  import { AppName, type AppMessage } from "../types";
  import type { Option } from "./types";
  import {
    readAllPullRequestsNumbers,
    sendSaveAppStateMessage,
    sendStateMessage,
  } from "./helpers";
  import { Button, Switch, NativeSelect, TextInput } from "@svelteuidev/core";
  import { Backpack, ArrowLeft } from "radix-icons-svelte";
  import packageInfo from "../../package.json";

  const Staging = "staging";
  const Production = "production";

  const WiredSupportedAppTargetVersions: Option[] = [
    {
      value: Staging,
      label: "Staging",
    },
    {
      value: Production,
      label: "Production",
    },
  ];

  let supportedAppTargetVersions = [...WiredSupportedAppTargetVersions];

  let selectedAppVersion: string = supportedAppTargetVersions[0].value;
  let customAppVersion: number | null = null;
  let isAppActive = false;
  let saveTriggered = false;
  let customAppVersionInput: HTMLInputElement;
  let ghAccessToken: string = "";
  let optionsPageRequested = false;
  let ghAccessTokenError = "";

  const port = chrome.runtime.connect({
    name: `${AppName.Popup}`,
  });

  port.onMessage.addListener(async (message: AppMessage) => {
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
        isAppActive = message.payload.isActive;
        if (
          message.payload.ghAccessToken &&
          message.payload.ghAccessToken !== ghAccessToken
        ) {
          handleGHAccessTokenUpdate(message.payload.ghAccessToken);
        }
        break;
      }
      default: {
        console.error("unknown message detected");
      }
    }
  });

  const handleGHAccessTokenUpdate = async (newToken: string) => {
    ghAccessToken = newToken;
    const ghApVersions = (await readAllPullRequestsNumbers(ghAccessToken)).map(
      (data) => ({ label: data.title, value: `pr/${data.number}` }),
    );
    supportedAppTargetVersions = [
      ...WiredSupportedAppTargetVersions,
      ...ghApVersions,
    ];
  };

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
      selectedAppVersion = "";
      triggerAppStateUpdate();
    }
    if (!currentTarget.value) {
      selectedAppVersion = supportedAppTargetVersions[0].value;
    }
  };

  const triggerAppStateUpdate = () => {
    const prefixedCustomAppVersion = customAppVersion
      ? `pr/${customAppVersion}`
      : null;
    sendStateMessage(port, {
      appVersion: prefixedCustomAppVersion || selectedAppVersion,
      isActive: isAppActive,
      ghAccessToken,
    });
  };

  const handleAppConfigurationSave = () => {
    saveTriggered = true;
    setTimeout(() => {
      saveTriggered = false;
    }, 1000); // visual UX feedback

    sendSaveAppStateMessage(port);
  };

  const handleGHAccessTokenRequest = async () => {
    if (!ghAccessToken) {
      ghAccessTokenError = "Invalid Value";
      return;
    }
    ghAccessTokenError = "";
    saveTriggered = true;
    await handleGHAccessTokenUpdate(ghAccessToken);
    triggerAppStateUpdate();
    sendSaveAppStateMessage(port);
    saveTriggered = false;
    optionsPageRequested = false;
  };
</script>

<main class="grid gap-6">
  {#if !optionsPageRequested}
    <section class="absolute right-4 top-2">
      <Button
        override={{ fontSize: "8px" }}
        variant="subtle"
        color="indigo"
        size="xs"
        compact
        uppercase
        ripple
        on:click={() => (optionsPageRequested = true)}
        >Activate GH Access</Button
      >
    </section>
    <h1>Ventrata Checkout Injector</h1>
    <div class="grid gap-6 rounded-lg border border-gray-200 p-4">
      <section class="grid justify-items-center gap-2">
        <NativeSelect
          class="w-full"
          data={supportedAppTargetVersions}
          bind:value={selectedAppVersion}
          on:change={handleOnVersionSelect}
          placeholder="Pick one"
          label="Select checkout version"
        />
      </section>
      <h2 class="text-2xl font-bold">— OR —</h2>
      <section>
        <input
          placeholder="Set PR version manually"
          class="svelteUI-parody"
          bind:this={customAppVersionInput}
          type="number"
          on:blur={handleOnCustomAppVersionInput}
          on:keydown={(event) => {
            if (event.key === "Enter") {
              handleOnCustomAppVersionInput(event);
            }
          }}
        />
      </section>
    </div>
    <div class="grid gap-4">
      <Switch
        class="justify-self-center"
        size="md"
        onLabel="ON"
        offLabel="OFF"
        color="green"
        label="Extension"
        checked={isAppActive}
        on:change={() => {
          isAppActive = !isAppActive;
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
    </div>
  {:else}
    <section class="grid gap-2">
      <TextInput
        fullSize
        label="Your GH Access Token"
        error={ghAccessTokenError}
        bind:value={ghAccessToken}
      ></TextInput>
      <Button
        variant="outline"
        color="teal"
        compact
        uppercase
        ripple
        class="justify-self-center"
        loading={saveTriggered}
        on:click={handleGHAccessTokenRequest}>Request Access</Button
      >
    </section>
    <div>
      <Button
        fullSize
        ripple
        uppercase
        variant="light"
        color="gray"
        on:click={() => (optionsPageRequested = false)}
      >
        <ArrowLeft slot="leftIcon"></ArrowLeft>
        go back
      </Button>
    </div>
  {/if}
  <footer>
    <p class="text-xs text-gray-500">
      Version: {packageInfo.version}
    </p>
  </footer>
</main>
