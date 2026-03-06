# Repository Guidelines

## Project Structure & Module Organization

This project is a Chrome extension (Manifest V3) built with Svelte + TypeScript.

- `src/ContentScript/`: content script entry and DOM injection helpers.
- `src/ServiceWorker/`: background service worker, message handling, and extension state sync.
- `src/Popup/`: popup UI (`Views/`, `stores/`, `hooks/`, `icons/`).
- `src/types.ts`, `src/commonUtils.ts`: shared types and cross-module helpers.
- `public/manifest.json` and `public/assets/`: extension manifest and static assets.
- `dist/`: generated build output (do not edit manually).

## Coding Style & Naming Conventions

- Use `PascalCase` for Svelte components (for example `Views/Home.svelte`, `icons/Checkmark.svelte`).
- Keep runtime-specific logic inside its module (`ContentScript`, `ServiceWorker`, `Popup`) and shared logic in `src/commonUtils.ts` or `src/types.ts`.

## Build, Test, and Development Commands

- `npm run dev`: watch build for local development (multi-entry bundling).
- `npm run build`: one production build into `dist/`.
- `npm run check`: run `svelte-check` with the project TypeScript config.
- `npm run release`: rebuild and package `dist/` into `ventrata-checkout-injector.zip`.

## Commit & Pull Request Guidelines

Recent history follows concise, Conventional-Commit-style subjects such as `feat: ...` and `fix: ...`, plus version tags like `release v1.0.1`.

- Keep PRs focused and include:
  - What changed and why
  - Linked issue/PR references when applicable

## Feature Request Issues (GitHub)

Track larger changes as GitHub feature-request issues before implementation.

- Use a `feat:` style issue title that states the desired capability.
- Structure the body with:
  - `Summary`
  - `Problem`
  - `Requested Feature`
  - `Scope` (required flow and non-functional requirements)
  - `Acceptance Criteria`
- If the request depends on external APIs/services, include:
  - Official documentation links
  - Required setup/secrets
  - Caveats (review/approval limits, idempotency, permissions)
- Keep the issue implementation-focused and avoid conversational Q&A wording.
- Example: issue #15 (`feat: automate extension release pipeline (GitHub + Chrome Web Store)`):
  - https://github.com/DarkEye123/ventrata-checkout-injector/issues/15

## Security & Configuration Tips

- Treat `public/manifest.json` permission changes (`permissions`, `host_permissions`) as high-impact and call them out explicitly in PRs.

## Checkout Injection Notes

- Do not use a `MutationObserver` to continuously remove checkout script tags. Most customer integrations load checkout statically, and observer-based cleanup can remove legitimate scripts before replacement is ready.
- Keep original script blocking at the network layer via Declarative Net Request session rules in the service worker.
- Current blocking model is intentional:
  - allow checkout script requests that include the injector reference query (`?ref=ventrata-injector-extension`)
  - block the original production checkout script URL without that reference
- `data-config` compliance is strict for this extension path:
  - customer checkout `data-config` is expected to be valid JSON
  - if `data-config` is invalid and parsing fails, extension behavior may fail as well
  - this is acceptable because an invalid checkout configuration is already considered customer-visible checkout failure
- QA intent of this extension is to test new releases, PR builds, or local checkout code on running customer sites while preserving their real environment context (`env`) and integration behavior before release.
- Ventrata demo sites remain useful for targeted flows and edge-case validation, but they do not fully represent real customer environments; this extension exists to make customer-like flow verification easier to reach.
