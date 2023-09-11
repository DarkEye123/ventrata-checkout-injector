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
        contentScript: "src/ContentScript/index.ts",
      },
      formats: ["es"],
    },
  },
});

const workerConfig = defineConfig({
  build: {
    watch: {},
    rollupOptions: {
      output: {
        entryFileNames: "serviceWorker.js",
      },
    },
    lib: {
      entry: {
        serviceWorker: "src/ServiceWorker/index.ts",
      },
      name: "worker",
      formats: ["iife"],
    },
  },
});

build({ ...svelteConfig, configFile: false });
build({ ...workerConfig, configFile: false });
