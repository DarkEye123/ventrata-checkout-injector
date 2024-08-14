<script lang="ts">
  import { Button, TextInput } from "@svelteuidev/core";
  import Panel from "./Panel.svelte";
  import { handleGHAccessTokenUpdate } from "../helpers";
  import stateStore from "../stores/state";
  import { useAppStateSync } from "../hooks/appStateSync";

  const { requestAppStateSync } = useAppStateSync();

  let newAccessToken = $stateStore.ghAccessToken || "";

  let ghAccessTokenError = "";
  let isFetchingTokenData = false;

  const handleAccessTokenUpdate = async () => {
    isFetchingTokenData = true;
    $stateStore.ghAccessToken = newAccessToken;

    const { error } = await handleGHAccessTokenUpdate(newAccessToken);
    isFetchingTokenData = false;

    if (error) {
      ghAccessTokenError = error;
    } else {
      requestAppStateSync();
    }
  };

  $: requestAccessButtonEnabled =
    newAccessToken && newAccessToken !== $stateStore.ghAccessToken;

  $: {
    if (requestAccessButtonEnabled) {
      ghAccessTokenError = "";
    }
  }
</script>

<Panel showBackButton>
  <section
    class="grid gap-6 rounded-lg border border-gray-200 p-4"
    id="github-token"
  >
    <TextInput
      fullSize
      label="Your GH Access Token"
      error={ghAccessTokenError}
      bind:value={newAccessToken}
    ></TextInput>
    <Button
      variant="outline"
      color="teal"
      compact
      uppercase
      ripple
      class="justify-self-center"
      loading={isFetchingTokenData}
      disabled={!requestAccessButtonEnabled}
      on:click={handleAccessTokenUpdate}>Request Access</Button
    >
  </section>
</Panel>
