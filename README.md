# Ventrata Checkout Injector

Chrome extension for injecting alternative Ventrata checkout builds into real customer pages for QA and local development.

## Copy Configuration Menu

The extension provides a native browser context-menu entry:

- `Ventrata Checkout Injector`
- `Copy configuration`

It also supports a direct copy shortcut on the page:

- Windows: `Ctrl + left click`
- macOS: `Command + left click`

Chrome's extension context-menu API cannot reliably show a menu item only for the exact DOM element that was right-clicked inside `ventrata-checkout-element`, especially for shadow-DOM content. Because of that platform limitation, the extension uses a fallback model:

- the extension menu is shown on normal page right-clicks
- the content script tracks the last right-click target with `event.composedPath()`
- `Copy configuration` only performs a copy when the last right-click happened inside a `ventrata-checkout-element`
- the modifier-click shortcut only performs a copy when the clicked element is inside a `ventrata-checkout-element`
- the copied value is the exact `data-initial-configuration` attribute value from the nearest enclosing checkout component

This behavior is intentional and should not be reworked back into per-element native menu visibility unless Chrome exposes a supported API for that exact use case.

## Troubleshooting

If code changes do not appear in Chrome after reload, first verify that the unpacked extension is loaded from the correct worktree `dist` directory. A common failure mode in this repository is reloading an older `dist` from another branch or from `master`, which makes the runtime manifest and service worker differ from the files being edited.
