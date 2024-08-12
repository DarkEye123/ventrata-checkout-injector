<script lang="ts">
  import { Button, TextInput } from "@svelteuidev/core";
  import { createEventDispatcher } from "svelte";
  import Panel from "./Panel.svelte";
  export let isLoading = false;
  export let ghAccessToken = "";
  export let ghAccessTokenError = "";
  const dispatch = createEventDispatcher<{ requestAccess: void }>();
</script>

<Panel showBackButton>
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
      loading={isLoading}
      on:click={() => dispatch("requestAccess")}>Request Access</Button
    >
  </section>
</Panel>
