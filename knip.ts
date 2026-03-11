import type { KnipConfig } from "knip";

const config: KnipConfig = {
  $schema: "https://unpkg.com/knip@5/schema.json",
  entry: [
    "src/ContentScript/index.ts",
    "src/ContentScript/pageHook.ts",
    "src/ServiceWorker/index.ts",
    "src/Popup/main.ts",
  ],
  project: [
    "src/**/*.{ts,js,svelte,css,html}",
    "tests/**/*.{ts,js}",
    "public/**/*.{json,png,jpg,jpeg,svg,webp}",
    "tailwind.config.cjs",
  ],
  vitest: {
    entry: ["tests/**/*.{spec,test}.ts"],
  },
  ignore: ["tailwind.config.cjs"],
  svelte: true,
  typescript: {
    config: ["tsconfig.json"],
  },
  eslint: true,
  prettier: true,
  tailwind: {
    entry: ["src/Popup/app.css"],
  },
  postcss: true,
};

export default config;
