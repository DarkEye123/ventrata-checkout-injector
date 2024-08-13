<script lang="ts">
  import { Button, TextInput } from "@svelteuidev/core";
  import Panel from "./Panel.svelte";
  import { extendAppTargetVersionStore } from "../stores/appVersions";
  import { readAllPullRequestsNumbers } from "../helpers";
  import type { Option } from "../types";
  import stateStore, { saveActionInProgress } from "../stores/state";
  import { useAppStateSync } from "../hooks/appStateSync";

  const { appStateSyncReady } = useAppStateSync();

  let newAccessToken = $stateStore.ghAccessToken || "";

  let ghAccessTokenError = "";
  let isFetchingTokenData = false;

  const handleGHAccessTokenUpdate = async () => {
    isFetchingTokenData = true;
    $stateStore.ghAccessToken = newAccessToken;

    const listOfPRNumbers = await readAllPullRequestsNumbers(newAccessToken);
    if (listOfPRNumbers.length === 0) {
      isFetchingTokenData = false;
      ghAccessTokenError = "fetched PR list is empty, verify token validity";
      return;
    }
    const ghApVersions = listOfPRNumbers.map<Option>((data) => ({
      label: data.title,
      value: String(data.number),
    }));
    extendAppTargetVersionStore(ghApVersions);
    isFetchingTokenData = false;
    appStateSyncReady();
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
      on:click={handleGHAccessTokenUpdate}>Request Access</Button
    >
  </section>
</Panel>
