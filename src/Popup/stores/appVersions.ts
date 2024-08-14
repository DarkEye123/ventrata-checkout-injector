import { writable } from "svelte/store";
import { publicVersions, type Option } from "../types";

const supportedAppTargetVersionsStore = writable<Option[]>(publicVersions);

function extendAppTargetVersionStore(newVersions: Option[]) {
  supportedAppTargetVersionsStore.set([...publicVersions, ...newVersions]);
}

export { extendAppTargetVersionStore, supportedAppTargetVersionsStore };
