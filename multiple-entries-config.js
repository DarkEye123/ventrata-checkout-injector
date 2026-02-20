import { defineConfig, build } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const args = process.argv.slice(2);
const watch = !!args.find((arg) => arg.match(/(-w)|(--watch)/));

// https://vitejs.dev/config/
// manifest is copied to 'dist' because of https://vitejs.dev/config/shared-options.html#publicdir

const svelteConfig = defineConfig({
  plugins: [svelte()],
  build: {
    emptyOutDir: false,
    watch: watch ? {} : null,
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
    watch: watch ? {} : null,
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
    watch: watch ? {} : null,
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

const pageHookScript = defineConfig({
  build: {
    emptyOutDir: false,
    watch: watch ? {} : null,
    rollupOptions: {
      output: {
        entryFileNames: "pageHook.js",
      },
    },
    lib: {
      entry: {
        pageHook: "src/ContentScript/pageHook.ts",
      },
      name: "pageHook",
      formats: ["iife"],
    },
  },
});

build({ ...svelteConfig, configFile: false });
build({ ...contentScript, configFile: false });
build({ ...pageHookScript, configFile: false });
build({ ...workerConfig, configFile: false });
