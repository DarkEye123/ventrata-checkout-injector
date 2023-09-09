import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vitejs.dev/config/
// manifest is copied to 'dist' because of https://vitejs.dev/config/shared-options.html#publicdir
export default defineConfig({
  plugins: [svelte()],
  assetsInclude: ["**/*.json"],
  build: {
    emptyOutDir: true,
    watch: {},
    lib: {
      entry: {
        popup: "src/Popup/index.html",
      },
      formats: ["es"],
    },
  },
});
