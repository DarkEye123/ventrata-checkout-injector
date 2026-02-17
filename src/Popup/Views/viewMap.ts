import type { SvelteComponent } from "svelte";
import type { SupportedViews } from "../stores/navigation";

type ViewComponent = typeof SvelteComponent;

const viewMap: Record<
  SupportedViews,
  {
    default: () => Promise<{ default: ViewComponent }>;
    navigationList: SupportedViews[];
  }
> = {
  home: {
    default: () => import("./Home.svelte") as Promise<{ default: ViewComponent }>,
    navigationList: ["settings"],
  },
  settings: {
    default: () => import("./Settings.svelte") as Promise<{ default: ViewComponent }>,
    navigationList: ["home"],
  },
};

export { viewMap, type ViewComponent };
