# Ventrata Checkout Injector

Chrome extension for injecting alternative Ventrata checkout builds into real customer pages for QA and local development.

## Copy Configuration Menu

The extension provides a native browser context-menu entry:

- `Ventrata Checkout Injector`
- `Copy configuration`

Chrome's extension context-menu API cannot reliably show a menu item only for the exact DOM element that was right-clicked inside `ventrata-checkout-element`, especially for shadow-DOM content. Because of that platform limitation, the extension uses a fallback model:

- the extension menu is shown on normal page right-clicks
- the content script tracks the last right-click target with `event.composedPath()`
- `Copy configuration` only performs a copy when the last right-click happened inside a `ventrata-checkout-element`
- the copied value is the exact `data-initial-configuration` attribute value from the nearest enclosing checkout component

This behavior is intentional and should not be reworked back into per-element native menu visibility unless Chrome exposes a supported API for that exact use case.
