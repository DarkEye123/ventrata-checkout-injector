import { Production, Staging } from "../types";

interface Option {
  value: string;
  label: string;
}

const publicVersions: Option[] = [
  {
    value: Staging,
    label: "Staging",
  },
  {
    value: Production,
    label: "Production",
  },
];

export { type Option, publicVersions };
