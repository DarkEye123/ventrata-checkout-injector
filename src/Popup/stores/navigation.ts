import { writable } from "svelte/store";

type SupportedViews = "home" | "settings";

const currentViewName = writable<SupportedViews>("home");

export { currentViewName, type SupportedViews };
