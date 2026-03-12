# Review Notes

Initial reference commit: `f4df046e1e9ed736963fa11fe924a8e65a9351fc`

Review target: current worktree state

Purpose: capture human review findings, questions, and follow-up adjustments before implementation.

## Status

- Implementation delivered
- Session constraint: place tests next to the source file they cover, in the same folder
- Browser support assumption for follow-up implementation: target the latest 2 browser releases only; no legacy browser compatibility workarounds are needed

## Notes

- `n1`: `src/ContentScript/helpers.ts` does not appear to be directly covered by tests in the current worktree state.
  Evidence:
  `tests/content-script.test.ts` mocks `../src/ContentScript/helpers` and replaces `injectScript` with `injectScriptMock`, so the helper implementation is bypassed there.
  Impact:
  logic in `injectScript()` is currently unverified, including original checkout script detection, `data-config` parsing fallback, merged override generation, script replacement, and `load`/`error` event handling.
  Resolution:
  implemented in `src/ContentScript/helpers.test.ts`.
- `n2`: tests added with the feature are placed in the top-level `tests/` directory instead of next to the source they cover.
  Evidence:
  the current tree still contains `tests/content-script.test.ts` and `tests/service-worker.test.ts`.
  Impact:
  this conflicts with the session requirement to colocate tests with their source modules, so these tests should be moved to the relevant source folders during the adjustment pass.
  Resolution:
  implemented by moving tests into `src/ContentScript/*.test.ts` and `src/ServiceWorker/index.test.ts`, and by updating `vitest.config.ts` to scan `src/**/*.{test,spec}.ts`.
- `n3`: `getOriginElement()` and `originTagName` in `src/ContentScript/index.ts` appear to be removable.
  Evidence:
  `originTagName` is only stored in `CheckoutContextState`, assigned in `resolveCheckoutContextState()`, and then used for a single debug log line: `console.log("Ventrata Injector::copy configuration origin", originTagName)`.
  Impact:
  this adds state and branching with no observable behavior change beyond debug logging, so it looks like unnecessary complexity.
  Resolution:
  removed during content-script copy-flow extraction.
- `n4`: `hasCheckoutContext` can be removed and the flow can rely on `initialConfiguration` alone.
  Evidence:
  the current implementation uses `hasCheckoutContext` only for guard branches and an informational log path; the desired behavior is to allow copy to proceed even when the resolved value is `undefined`.
  Impact:
  the content-script state can be simplified by removing `hasCheckoutContext`, dropping the outside-checkout log distinction, and allowing the clipboard value to remain `String(initialConfiguration)`.
  Resolution:
  implemented in `src/ContentScript/copyCheckoutConfiguration.ts`.
- `n5`: `syncCheckoutContextState()` in `src/ContentScript/index.ts` is redundant.
  Evidence:
  it only performs `latestCheckoutContextState = state` and is called only by `captureCheckoutContext()`, so it adds no behavior or abstraction value.
  Impact:
  this can be inlined or removed as part of content-script simplification.
  Resolution:
  removed during content-script copy-flow extraction.
- `n6`: simplify `captureCheckoutContext()` after the earlier state cleanups are applied.
  Evidence:
  it is currently a thin wrapper around `resolveCheckoutContextState()` plus assignment through `syncCheckoutContextState()`.
  Impact:
  once `originTagName` and `hasCheckoutContext` are removed, this helper should likely be inlined or reduced to a more direct assignment-focused helper.
  Resolution:
  replaced by `rememberContextMenuCheckoutConfiguration()` in `src/ContentScript/copyCheckoutConfiguration.ts`.
- `n7`: split shortcut copy flow from context-menu copy flow.
  Evidence:
  shortcut copy currently has direct access to the triggering `mousedown` event, but still routes through shared global state because `copyLatestCheckoutConfiguration()` is also used by the later context-menu message path.
  Impact:
  shortcut copy can derive and copy the configuration directly from the event, while stored latest context should be kept only for the right-click/context-menu path.
  Resolution:
  implemented in `src/ContentScript/copyCheckoutConfiguration.ts`.
- `n8`: split `src/ContentScript/index.ts` by feature-focused modules instead of keeping message-specific logic and helpers in one file.
  Evidence:
  the current file mixes message handling, copy-configuration behavior, app-state behavior, checkout presence synchronization, and bootstrap wiring.
  Impact:
  extract at least:
  `copy-checkout-configuration` feature module,
  `app-state` feature module,
  `checkout presence` module,
  with `index.ts` reduced to initialization and event/message wiring. More modules can be introduced later if the feature surface grows.
  Tests should be split and colocated along the same feature boundaries.
  Resolution:
  implemented with `src/ContentScript/appState.ts`, `src/ContentScript/copyCheckoutConfiguration.ts`, `src/ContentScript/checkoutPresence.ts`, and matching colocated test files.
- `n9`: simplify service-worker context menu API usage for modern browser targets.
  Evidence:
  current Chrome docs indicate `chrome.contextMenus.removeAll()` and `chrome.contextMenus.update()` are Promise-based in Chrome 123+, while `chrome.contextMenus.create()` still uses callback-based error reporting through `chrome.runtime.lastError`.
  Impact:
  with support limited to the latest 2 browser releases, obsolete Promise wrappers around `removeAll()` and `update()` should be removed, while `create()` handling should remain intentionally callback-aware.
  Resolution:
  implemented in `src/ServiceWorker/index.ts`.
- `n10`: `ensureContextMenu()` and `ensureContextMenuPromise` appear to be unnecessary over-engineering.
  Evidence:
  context menu initialization currently runs only from startup/install paths, and there is no demonstrated need for single-flight concurrency protection around `createContextMenu()`.
  Impact:
  simplify context menu setup by removing the in-flight Promise guard unless a concrete race condition needs to be handled.
  Resolution:
  implemented in `src/ServiceWorker/index.ts` by calling `createContextMenu()` directly from startup/install.
- `n11`: service-worker-side checkout presence probing is over-engineering and should be removed.
  Evidence:
  `detectCheckoutScriptPresence()` duplicates presence-detection intent that is already available from the content script, and the desired behavior is to rely on content-script reporting instead of probing page DOM state from the service worker.
  Impact:
  remove the worker-side fallback detection/cache path and let checkout presence be driven by content-script updates, accepting that menu visibility may become correct only after content-script initialization/reporting.
  Resolution:
  implemented in `src/ServiceWorker/index.ts`; menu visibility now depends on content-script presence reports and cached tab state only.
- `n12`: update documentation after implementation to remove stale behavior descriptions.
  Evidence:
  the planned simplifications and refactors will change structure and runtime behavior assumptions in both content-script and service-worker flows.
  Impact:
  update `README.md` and `AGENTS.md` accordingly so repository guidance does not describe removed logic, outdated architecture, or stale test placement.
  Resolution:
  implemented in `README.md` and `AGENTS.md`.

## Approved Adjustments

- `n1` through `n12` approved and implemented in this pass.
