# Ventrata Checkout Injector

Chrome extension for injecting alternative Ventrata checkout builds into real customer pages for QA and local development.

## Static Analysis

Use `knip` to check for unused files, exports, and dependencies:

- `npm run knip`
- `npm run knip:fix`
- `npm run knip:watch`

The current setup intentionally ignores `tailwind.config.cjs`, because Tailwind loads that file implicitly through the PostCSS integration and `knip` treats it as unused otherwise.

## Testing

Unit tests are colocated with the source modules they cover under `src/` and run via:

- `npm test`

## Copy Configuration Menu

The extension provides a native browser context-menu entry:

- `Ventrata Checkout Injector`
- `Copy configuration`

It also supports a direct copy shortcut on the page:

- Windows: `Ctrl + left click`
- macOS: `Command + left click`

Use either action on an element inside a checkout widget:

- right click, then select `Ventrata Checkout Injector` -> `Copy configuration`
- Windows: `Ctrl + left click`
- macOS: `Command + left click`

The extension copies the exact `data-initial-configuration` value from the nearest enclosing `ventrata-checkout-element`.

If no checkout configuration is resolved for the triggered action, the extension intentionally copies the literal string `"undefined"` instead of skipping the copy.

The context-menu entry is intended for pages that expose Ventrata checkout markers, such as:

- the checkout script URL containing `ventrata-checkout.min.js`
- the `ventrata-checkout-element` web component
- integration trigger markers like `ventrata-embedded-widget`, `ventrata-checkout`, or `ventrata-manage-my-booking`

Menu visibility is driven by content-script presence reporting after the page initializes.

## Troubleshooting

If code changes do not appear in Chrome after reload, first verify that the unpacked extension is loaded from the correct worktree `dist` directory. A common failure mode in this repository is reloading an older `dist` from another branch or from `master`, which makes the runtime manifest and service worker differ from the files being edited.
