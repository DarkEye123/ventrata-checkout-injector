<script lang="ts">
  import { Switch, NativeSelect } from "@svelteuidev/core";
  import stateStore, { appStateSyncInProgress } from "../stores/state";
  import Panel from "./Panel.svelte";
  import { supportedAppTargetVersionsStore } from "../stores/appVersions";
  import { useAppStateSync } from "../hooks/appStateSync";
  import { isPublicEnvironment } from "../../commonUtils";
  import { CircleBackslash, ArrowRight } from "radix-icons-svelte";
  import clsx from "clsx";

  export let saveButtonEnabled: boolean;

  let customAppVersionInput: HTMLInputElement;
  let publicAppVersionInput: HTMLInputElement;
  const { appStateSyncReady } = useAppStateSync();

  const handleOnVersionSelect = (
    event: any, // problem with TS retyping
  ) => {
    const selectedAppVersion = event.currentTarget?.value || "";
    $stateStore.appVersion = selectedAppVersion;
    customAppVersionInput.value = "";
    appStateSyncReady();
  };

  const handleOnCustomAppVersionInput: (event: {
    currentTarget: HTMLInputElement;
  }) => void = ({ currentTarget }) => {
    $stateStore.appVersion = String(currentTarget.value);
    publicAppVersionInput.value = "";
    if (!currentTarget.value) {
      $stateStore.appVersion = $supportedAppTargetVersionsStore[0].value;
    }
    appStateSyncReady();
  };
</script>

<Panel on:requestAppStateSync showSaveButton {saveButtonEnabled}>
  <section class="grid gap-6 rounded-lg border border-gray-200 p-4">
    <div class="grid gap-4 p-4">
      <NativeSelect
        class="w-full"
        bind:element={publicAppVersionInput}
        data={$supportedAppTargetVersionsStore}
        value={isPublicEnvironment($stateStore.appVersion)
          ? $stateStore.appVersion
          : ""}
        on:change={handleOnVersionSelect}
        placeholder="Pick one"
        label="Select checkout version"
        disabled={$appStateSyncInProgress}
      >
        <div
          slot="icon"
          class={clsx({
            "animate-pulse rounded-lg bg-red-100 p-1": $appStateSyncInProgress,
          })}
        >
          {#if $appStateSyncInProgress}
            <CircleBackslash></CircleBackslash>
          {:else}
            <ArrowRight></ArrowRight>
          {/if}
        </div>
      </NativeSelect>
      <h2 class="text-lg font-bold">— OR —</h2>
      <input
        placeholder="Set PR version manually"
        class="svelteUI-parody"
        bind:this={customAppVersionInput}
        value={!isPublicEnvironment($stateStore.appVersion)
          ? $stateStore.appVersion
          : ""}
        on:blur={handleOnCustomAppVersionInput}
        on:keydown={(event) => {
          if (event.key === "Enter") {
            handleOnCustomAppVersionInput(event);
          }
        }}
      />
      <Switch
        class="justify-self-center"
        size="md"
        onLabel="ON"
        offLabel="OFF"
        color="green"
        label="Extension"
        checked={$stateStore.extensionIsActive}
        on:change={() => {
          $stateStore.extensionIsActive = !$stateStore.extensionIsActive;
          appStateSyncReady();
        }}
      />
      <Switch
        class="justify-self-center"
        size="md"
        onLabel="ON"
        offLabel="OFF"
        color="blue"
        label="Test mode"
        checked={$stateStore.checkoutScriptConfigOverrides?.env === "test"}
        on:change={() => {
          $stateStore.checkoutScriptConfigOverrides = {
            ...($stateStore.checkoutScriptConfigOverrides ?? { env: "live" }),
            env:
              ($stateStore.checkoutScriptConfigOverrides?.env ?? "live") ===
              "test"
                ? "live"
                : "test",
          };
          appStateSyncReady();
        }}
      />
    </div>
  </section>
</Panel>
