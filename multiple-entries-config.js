import { defineConfig, build } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vitejs.dev/config/
// manifest is copied to 'dist' because of https://vitejs.dev/config/shared-options.html#publicdir

const svelteConfig = defineConfig({
  plugins: [svelte()],
  build: {
    watch: {},
    lib: {
      entry: {
        popup: "src/Popup/index.html",
      },
      formats: ["es"],
    },
  },
});
const workerConfig = defineConfig({
  build: {
    watch: {},
    lib: {
      entry: {
        serviceWorker: "src/ServiceWorker/index.ts",
        contentScript: "src/ContentScript/index.ts",
      },
      formats: ["es"],
    },
  },
});
// console.log(svelteConfig);
const test = build({ ...svelteConfig, configFile: false });
const test2 = build({ ...workerConfig, configFile: false });
// return test;
// return svelteConfig;
// build(workerConfig);
// return {};
