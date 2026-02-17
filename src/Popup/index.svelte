<script lang="ts">
  import { onMount } from "svelte";
  import { AppName, type AppMessage } from "../types";
  import {
    handleGHAccessTokenUpdate,
    readCurrentActiveTabId,
    sendGetAppStateMessage,
    sendSaveAppStateMessage,
  } from "./helpers";
  import { Button } from "@svelteuidev/core";
  import { viewMap, type ViewComponent } from "./Views/viewMap";
  import { currentViewName } from "./stores/navigation";
  import stateStore, {
    appStateSyncInProgress,
    saveActionInProgress,
  } from "./stores/state";

  const port = chrome.runtime.connect({
    name: `${AppName.Popup}`,
  });
  let activeTabId: number | undefined;

  let canRender = false;

  port.onMessage.addListener(async (message: AppMessage) => {
    console.log("popup port script message", message);
    switch (message.name) {
      case "app-state": {
        appStateSyncInProgress.set(true);
        canRender = true;
        const {
          appVersion,
          extensionIsActive,
          checkoutScriptConfigOverrides,
          ghAccessToken,
        } = message.payload;
        stateStore.update((state) => ({
          ...state,
          appVersion,
          extensionIsActive,
          checkoutScriptConfigOverrides: {
            ...(checkoutScriptConfigOverrides ?? {}),
            env:
              checkoutScriptConfigOverrides?.env === "test" ? "test" : "live",
          },
        }));
        if (ghAccessToken && ghAccessToken !== $stateStore.ghAccessToken) {
          $stateStore.ghAccessToken = ghAccessToken;
          await handleGHAccessTokenUpdate(ghAccessToken);
        }
        appStateSyncInProgress.set(false);
        break;
      }
      default: {
        console.error("unknown message detected");
      }
    }
  });

  const handleAppConfigurationSave = () => {
    saveActionInProgress.set(true);
    setTimeout(() => {
      saveActionInProgress.set(false);
      saveButtonEnabled = false;
    }, 1000); // visual UX feedback

    sendSaveAppStateMessage(port, $stateStore, activeTabId);
  };

  const init = async () => {
    try {
      activeTabId = await readCurrentActiveTabId();
    } catch (error) {
      console.error("Failed to read active tab ID", error);
    }
    sendGetAppStateMessage(port, activeTabId);
  };

  let saveButtonEnabled = false;

  let activeView: ViewComponent;
  $: activeViewMap = viewMap[$currentViewName];
  $: activeViewFn = activeViewMap.default;
  $: activeViewFn().then((view) => {
    activeView = view.default;
  });

  onMount(() => {
    init();
  });
</script>

{#if canRender}
  <nav class="absolute right-4 top-2">
    {#each activeViewMap.navigationList as navigationItem}
      <Button
        override={{ fontSize: "8px", textTransform: "uppercase" }}
        variant="subtle"
        color="indigo"
        size="xs"
        compact
        uppercase
        ripple
        on:click={() => currentViewName.set(navigationItem)}
        >{navigationItem}</Button
      >
    {/each}
  </nav>
  <svelte:component
    this={activeView}
    {saveButtonEnabled}
    on:requestAppStateSync={handleAppConfigurationSave}
    on:appStateSyncReady={() => {
      saveButtonEnabled = true;
    }}
  />
{:else}
  <main class="flex animate-bounce items-center justify-center text-xl">
    <h1>Loading ...</h1>
  </main>
{/if}
