<script lang="ts">
  import { AppName, type AppMessage } from "../types";
  import {
    readAllPullRequestsNumbers,
    sendSaveAppStateMessage,
  } from "./helpers";
  import { Button } from "@svelteuidev/core";
  import { viewMap, type ViewComponent } from "./Views/viewMap";
  import { currentViewName } from "./stores/navigation";
  import stateStore, { saveActionInProgress } from "./stores/state";
  import { extendAppTargetVersionStore } from "./stores/appVersions";
  import type { Option } from "./types";

  let ghAccessToken: string = "";
  let optionsPageRequested = false;
  let ghAccessTokenError = "";

  const port = chrome.runtime.connect({
    name: `${AppName.Popup}`,
  });

  let canRender = false;

  port.onMessage.addListener(async (message: AppMessage) => {
    console.log("popup port script message", message);
    switch (message.name) {
      case "app-state": {
        canRender = true;
        const { appVersion, extensionIsActive, ghAccessToken } =
          message.payload;
        stateStore.update((state) => ({
          ...state,
          appVersion,
          extensionIsActive,
        }));
        if (ghAccessToken && ghAccessToken !== $stateStore.ghAccessToken) {
          handleGHAccessTokenUpdate(ghAccessToken);
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
    const ghApVersions = (
      await readAllPullRequestsNumbers(ghAccessToken)
    ).map<Option>((data) => ({
      label: data.title,
      value: String(data.number),
    }));
    extendAppTargetVersionStore(ghApVersions);
  };

  const handleAppConfigurationSave = () => {
    saveActionInProgress.set(true);
    setTimeout(() => {
      saveActionInProgress.set(false);
      saveButtonEnabled = false;
    }, 1000); // visual UX feedback

    console.log("here");
    sendSaveAppStateMessage(port, $stateStore);
  };

  const handleGHAccessTokenRequest = async () => {
    if (!ghAccessToken) {
      ghAccessTokenError = "Invalid Value";
      return;
    }
    ghAccessTokenError = "";
    saveActionInProgress.set(true);
    await handleGHAccessTokenUpdate(ghAccessToken);
    sendSaveAppStateMessage(port, $stateStore);
    saveActionInProgress.set(false);
    optionsPageRequested = false;
  };

  let saveButtonEnabled = false;

  let activeView: ViewComponent;
  $: activeViewFn = viewMap[$currentViewName];
  $: activeViewFn().then((view) => {
    activeView = view.default;
  });
</script>

{#if canRender}
  <svelte:component
    this={activeView}
    {saveButtonEnabled}
    on:requestAppStateSync={handleAppConfigurationSave}
    on:appStateSyncReady={() => {
      saveButtonEnabled = true;
    }}
  />

  <section class="absolute right-4 top-2">
    <Button
      override={{ fontSize: "8px" }}
      variant="subtle"
      color="indigo"
      size="xs"
      compact
      uppercase
      ripple
      on:click={() => (optionsPageRequested = true)}>Activate GH Access</Button
    >
  </section>
  <!-- <GithubAccess
      isLoading={saveTriggered}
      on:requestAccess={handleGHAccessTokenRequest}
      bind:ghAccessToken
      {ghAccessTokenError}
      ><Button
        fullSize
        ripple
        uppercase
        variant="light"
        color="gray"
        on:click={() => (optionsPageRequested = false)}
      >
        <ArrowLeft slot="leftIcon"></ArrowLeft>
        go back
      </Button></GithubAccess
    > -->
  <footer></footer>
{:else}
  <main class="flex animate-bounce items-center justify-center text-xl">
    <h1>Loading ...</h1>
  </main>
{/if}
