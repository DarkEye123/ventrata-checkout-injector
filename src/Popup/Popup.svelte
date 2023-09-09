<script lang="ts">
  // const SupportedAppTargetVersions = [{
  //   value:
  // }]
  function handleVersionSelection() {}
</script>

<main>
  <h1>Ventrata Checkout Injector</h1>
  <section>
    <label>
      Checkout version:
      <select on:change={handleVersionSelection}>
        <option value="staging">Staging</option>
        <option value="production">Production</option>
      </select>
    </label>
  </section>
</main>
