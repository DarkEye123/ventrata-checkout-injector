# Ventrata Checkout Injector

Chrome extension for injecting alternative Ventrata checkout builds into real customer pages for QA and local development.

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

Note: the browser menu entry may still be visible outside the checkout widget, but copying only happens when the clicked element belongs to a `ventrata-checkout-element`.

## Troubleshooting

If code changes do not appear in Chrome after reload, first verify that the unpacked extension is loaded from the correct worktree `dist` directory. A common failure mode in this repository is reloading an older `dist` from another branch or from `master`, which makes the runtime manifest and service worker differ from the files being edited.
