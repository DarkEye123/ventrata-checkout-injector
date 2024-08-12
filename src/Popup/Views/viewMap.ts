import type { SvelteComponent } from "svelte";
import type { SupportedViews } from "../stores/navigation";

type ViewComponent = typeof SvelteComponent;

const viewMap: Record<
  SupportedViews,
  () => Promise<{ default: ViewComponent }>
> = {
  home: () => import("./Home.svelte") as Promise<{ default: ViewComponent }>,
  settings: () =>
    import("./Settings.svelte") as Promise<{ default: ViewComponent }>,
};

export { viewMap, type ViewComponent };
