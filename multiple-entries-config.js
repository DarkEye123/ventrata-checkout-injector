import { defineConfig, build } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vitejs.dev/config/
// manifest is copied to 'dist' because of https://vitejs.dev/config/shared-options.html#publicdir

const svelteConfig = defineConfig({
  plugins: [svelte()],
  build: {
    emptyOutDir: false,
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
    emptyOutDir: false,
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
      name: "serviceWorker",
      formats: ["iife"],
    },
  },
});

const contentScript = defineConfig({
  build: {
    emptyOutDir: false,
    watch: {},
    rollupOptions: {
      output: {
        entryFileNames: "contentScript.js",
      },
    },
    lib: {
      entry: {
        contentScript: "src/ContentScript/index.ts",
      },
      name: "contentScript",
      formats: ["iife"],
    },
  },
});

build({ ...svelteConfig, configFile: false });
build({ ...contentScript, configFile: false });
build({ ...workerConfig, configFile: false });
