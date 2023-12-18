<script lang="ts">
  import { Button, Switch, NativeSelect, TextInput } from "@svelteuidev/core";
  import type { Option } from "../types";

  export let supportedAppTargetVersions: Option[]
  export let selectedAppVersion: string;
</script>



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