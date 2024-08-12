<script lang="ts">
  import { Backpack, ArrowLeft } from "radix-icons-svelte";
  import { Button } from "@svelteuidev/core";
  import { currentViewName } from "../stores/navigation";
  import { saveActionInProgress } from "../stores/state";
  import packageInfo from "../../../package.json";
  import clsx from "clsx";
  import { useAppStateSync } from "../hooks/appStateSync";

  const { requestAppStateSync } = useAppStateSync();

  export let saveButtonEnabled = false;
  export let showSaveButton = false;
  export let showBackButton = false;
</script>

<main class="grid gap-6">
  {#if $currentViewName === "home"}
    <h1 class="text-xl">Ventrata Checkout Injector</h1>
  {/if}

  <slot></slot>
  <footer class="grid gap-6">
    {#if showSaveButton}
      <Button
        on:click={requestAppStateSync}
        variant="light"
        color="green"
        ripple
        fullSize
        disabled={!saveButtonEnabled}
        loading={$saveActionInProgress}
      >
        <Backpack slot="leftIcon" />
        {$saveActionInProgress ? "Saving..." : "Save configuration"}
      </Button>
    {/if}
    {#if showBackButton}
      <Button
        fullSize
        ripple
        uppercase
        variant="light"
        color="gray"
        on:click={() => currentViewName.set("home")}
      >
        <ArrowLeft slot="leftIcon"></ArrowLeft>
        go back
      </Button>
    {/if}
    <p
      class={clsx("flex gap-2 text-xs text-gray-500", {
        "justify-end": $currentViewName !== "home",
        "justify-center": $currentViewName === "home",
      })}
    >
      {#if $currentViewName !== "home"}
        <span>Ventrata Checkout Injector</span>
      {/if}
      <span>Version: {packageInfo.version}</span>
    </p>
  </footer>
</main>
