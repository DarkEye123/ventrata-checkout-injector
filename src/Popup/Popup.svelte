<script lang="ts">
  import type { Option } from "./types";
  import clsx from "clsx";

  const SupportedAppTargetVersions: Option[] = [
    {
      value: "staging",
      text: "Staging",
    },
    {
      value: "production",
      text: "Production",
    },
  ];

  let selectedAppVersion = SupportedAppTargetVersions[0].value;
  let isAppOverloadActive = false;
</script>

<main class="grid gap-2">
  <h1>Ventrata Checkout Injector</h1>
  <section>
    <label>
      Checkout version:
      <select bind:value={selectedAppVersion}>
        {#each SupportedAppTargetVersions as { value, text }}
          <option {value}> {text}</option>
        {/each}
      </select>
    </label>
  </section>
  <footer>
    <div>
      <span>Extension is:</span>
      <button
        class={clsx({
          "bg-green-200": isAppOverloadActive,
          "bg-red-200": !isAppOverloadActive,
        })}
        on:click={() => (isAppOverloadActive = !isAppOverloadActive)}
        >{isAppOverloadActive ? "enabled" : "disabled"}</button
      >
    </div>
  </footer>
</main>
