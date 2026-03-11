const VENTRATA_CHECKOUT_SCRIPT_FILENAME = "ventrata-checkout.min.js";
const VENTRATA_CHECKOUT_ELEMENT_TAG = "ventrata-checkout-element";
const VENTRATA_PAGE_MARKER_ATTRIBUTES = [
  "ventrata-embedded-widget",
  "ventrata-checkout",
  "ventrata-manage-my-booking",
] as const;

const VENTRATA_PAGE_MARKER_SELECTORS = [
  `script[src*="${VENTRATA_CHECKOUT_SCRIPT_FILENAME}"]`,
  VENTRATA_CHECKOUT_ELEMENT_TAG,
  ...VENTRATA_PAGE_MARKER_ATTRIBUTES.map((attributeName) => `[${attributeName}]`),
];

function hasVentrataPageMarkers(root: ParentNode) {
  return VENTRATA_PAGE_MARKER_SELECTORS.some((selector) => root.querySelector(selector));
}

export {
  VENTRATA_CHECKOUT_SCRIPT_FILENAME,
  VENTRATA_CHECKOUT_ELEMENT_TAG,
  VENTRATA_PAGE_MARKER_ATTRIBUTES,
  VENTRATA_PAGE_MARKER_SELECTORS,
  hasVentrataPageMarkers,
};
