# Package Upgrade Path

## Overview

### Current Project State

- **Svelte**: 4.2.20 (Manifest V3 Chrome extension)
- **Vite**: 5.4.21
- **TailwindCSS**: 3.4.4
- **TypeScript**: Latest compatible with ESLint 8
- **ESLint**: 8.57.1
- **SvelteUI**: 0.15.6

### Goal of This Upgrade Path

Incrementally upgrade dependencies to newer stable versions while maintaining compatibility, fixing linting issues, and preparing for future major version migrations. This path prioritizes low-risk updates first, deferring breaking changes until prerequisites are met.

### What's Deferred

- **Svelte v5 migration**: Requires Vite 8 upgrade first
- **Vite 8 upgrade**: Requires Svelte 5 compatibility
- **Vitest**: Needs Vite upgrade before it can be updated

---

## Upgrade Priority Table

| Package                          | Current | Target | Risk     | Status      | Notes/Dependencies                        |
| -------------------------------- | ------- | ------ | -------- | ----------- | ----------------------------------------- |
| @svelteuidev/core                | 0.15.6  | 0.15.7 | Easy     | Not Started | Patch version, no breaking changes        |
| tailwindcss                      | 3.4.4   | 3.4.19 | Easy     | Not Started | v3 only, stay on v3 (don't upgrade to v4) |
| eslint-config-prettier           | 9.1.0   | 10.1.8 | Low      | Not Started | Minor version, ESLint 10 compatible       |
| @typescript-eslint/parser        | 7.18.0  | 8.57.1 | Medium   | Not Started | Major version bump, requires ESLint 10    |
| @typescript-eslint/eslint-plugin | 7.18.0  | 8.57.1 | Medium   | Not Started | Major version bump, requires ESLint 10    |
| eslint                           | 8.57.1  | 10.0.3 | Medium   | Not Started | Major version, flat config recommended    |
| @eslint/js                       | 9.39.4  | 10.0.1 | Medium   | Not Started | ESLint 10 compatible                      |
| eslint-plugin-svelte             | 2.46.1  | 3.15.2 | Medium   | Not Started | Requires ESLint 10, Svelte 4 compatible   |
| vite                             | 5.4.21  | 8.0.0  | Critical | Deferred    | Requires Svelte 5                         |
| @sveltejs/vite-plugin-svelte     | 3.1.2   | 7.0.0  | Critical | Deferred    | Requires Svelte 5                         |
| svelte                           | 4.2.20  | 5.54.0 | Critical | Deferred    | Major breaking changes                    |
| vitest                           | 4.1.0   | TBD    | Critical | Deferred    | Requires Vite 8 first                     |

---

## Detailed Package Sections

### 1. @svelteuidev/core

```
Current: 0.15.6
Target:  0.15.7
```

**Peer Dependencies Required:**

- `svelte`: ^4.0.0 || ^5.0.0

**Breaking Changes:**

- None (patch version)

**Migration Notes:**

- Direct drop-in update
- Run: `npm install @svelteuidev/core@0.15.7`
- Verify UI components still render correctly

---

### 2. tailwindcss

```
Current: 3.4.4
Target:  3.4.19
```

**Peer Dependencies Required:**

- `postcss`: ^8.4.41
- `autoprefixer`: ^10.4.20

**Breaking Changes:**

- None (minor versions within v3)

**Migration Notes:**

- Stay on v3 only - do NOT upgrade to v4
- v4 has breaking API changes and new configuration syntax
- Run: `npm install tailwindcss@3.4.19`
- Verify build output hasn't changed
- Check `postcss.config.mjs` still works

---

### 3. eslint-config-prettier

```
Current: 9.1.0
Target:  10.1.8
```

**Peer Dependencies Required:**

- `eslint`: ^8.0.0 || ^9.0.0 || ^10.0.0

**Breaking Changes:**

- None documented for 10.x

**Migration Notes:**

- Compatible with ESLint 10
- No config changes needed
- Run: `npm install eslint-config-prettier@10.1.8`

---

### 4. @typescript-eslint/parser

```
Current: 7.18.0
Target:  8.57.1
```

**Peer Dependencies Required:**

- `eslint`: ^8.57.0 || ^9.0.0 || ^10.0.0
- `typescript`: >=4.8.4 <6.0.0

**Breaking Changes:**

- ESLint v8 parser API is deprecated, v9+ uses new flat config
- Some rules may have changed behavior
- TypeScript 5.x features better supported

**Migration Notes:**

- Requires ESLint 10 for full compatibility
- May need to migrate to flat config (`eslint.config.*`)
- Run both parser and plugin together:
  ```bash
  npm install @typescript-eslint/parser@8.57.1 @typescript-eslint/eslint-plugin@8.57.1
  ```

---

### 5. @typescript-eslint/eslint-plugin

```
Current: 7.18.0
Target:  8.57.1
```

**Peer Dependencies Required:**

- `eslint`: ^8.57.0 || ^9.0.0 || ^10.0.0
- `@typescript-eslint/parser`: 8.57.1 (matching version)

**Breaking Changes:**

- Major version bump
- Some deprecated rules removed
- New rules added
- Rule configurations may need updates

**Migration Notes:**

- Update parser first or simultaneously
- Run ESLint with `--fix` to auto-fix any issues
- Check for deprecated rule usage in config
- Review new rules that may be enabled by default

---

### 6. eslint

```
Current: 8.57.1
Target:  10.0.3
```

**Peer Dependencies Required:**

- All eslint plugins must be compatible with v10

**Breaking Changes:**

- **Flat config is now recommended** (`eslint.config.js`)
- `.eslintrc.*` files are deprecated (may still work)
- Parser API changes
- Some rules removed or merged
- `eslint-plugin-svelte` must be v3+

**Migration Notes:**

- Consider migrating to flat config format
- Update all eslint plugins to v10-compatible versions
- Run: `npm install eslint@10.0.3 @eslint/js@10.0.1`
- Test linting on all files
- May need to update `eslint.config.js` if using old format

---

### 7. @eslint/js

```
Current: 9.39.4
Target:  10.0.1
```

**Peer Dependencies Required:**

- `eslint`: 10.0.1 (matching version)

**Breaking Changes:**

- None documented for 10.x

**Migration Notes:**

- Required for ESLint 10 flat config
- Provides recommended configs
- Run: `npm install @eslint/js@10.0.1`

---

### 8. eslint-plugin-svelte

```
Current: 2.46.1
Target:  3.15.2
```

**Peer Dependencies Required:**

- `eslint`: ^8.57.0 || ^9.0.0 || ^10.0.0
- `svelte`: ^3.37.0 || ^4.0.0 || ^5.0.0

**Breaking Changes:**

- v3 requires ESLint 10 for flat config support
- Some rules may have new options
- Better Svelte 5 support

**Migration Notes:**

- Requires ESLint 10 upgrade
- Compatible with Svelte 4 and 5
- Run: `npm install eslint-plugin-svelte@3.15.2`
- May need to update ESLint config for flat config format

---

## Deferred Items

### Svelte v5 Migration Requirements

**Packages:**

- `svelte`: 4.2.20 → 5.54.0
- `@sveltejs/vite-plugin-svelte`: 3.1.2 → 7.0.0

**Requirements Before Upgrade:**

1. Read Svelte 5 migration guide
2. Review breaking changes:
   - Runes API is now the recommended approach
   - `$state`, `$derived`, `$effect` syntax
   - Component API changes
   - Reactivity model changes
3. Test all Svelte components with Svelte 5
4. Update any custom Svelte code to use runes where appropriate

**Migration Steps:**

```bash
# After prerequisites are met
npm install svelte@5.54.0 @sveltejs/vite-plugin-svelte@7.0.0
```

**Resources:**

- Svelte 5 Migration Guide: https://svelte.dev/docs/svelte/v5-migration-guide
- Runes Documentation: https://svelte.dev/docs/svelte/runes

---

### Vite Upgrade Requirements

**Packages:**

- `vite`: 5.4.21 → 8.0.0
- `vitest`: 4.1.0 → TBD

**Requirements Before Upgrade:**

1. Svelte 5 must be upgraded first (plugin compatibility)
2. Review Vite 8 changelog for breaking changes
3. Check all Vite plugins compatibility
4. Update `vite.config.ts` if needed

**Migration Steps:**

```bash
# After Svelte 5 upgrade
npm install vite@8.0.0
npm install vitest@latest
```

**Resources:**

- Vite Changelog: https://github.com/vitejs/vite/blob/main/packages/vite/CHANGELOG.md
- Vitest Changelog: https://github.com/vitest-dev/vitest/blob/main/CHANGELOG.md

---

## Execution Order

### Phase 1: Safe Updates (No Breaking Changes)

**Step 1.1: Patch Updates**

```bash
npm install @svelteuidev/core@0.15.7 tailwindcss@3.4.19
npm run build
npm run lint
npm run check
```

**Verification:**

- [ ] Build completes without errors
- [ ] Linting passes
- [ ] Svelte type checking passes
- [ ] Extension builds successfully
- [ ] UI components render correctly in popup

---

### Phase 2: ESLint Updates (Medium Risk)

**Step 2.1: Prepare ESLint 10**

```bash
npm install eslint@10.0.3 @eslint/js@10.0.1 eslint-config-prettier@10.1.8
```

**Step 2.2: Update TypeScript ESLint**

```bash
npm install @typescript-eslint/parser@8.57.1 @typescript-eslint/eslint-plugin@8.57.1
```

**Step 2.3: Update Svelte ESLint Plugin**

```bash
npm install eslint-plugin-svelte@3.15.2
```

**Step 2.4: Verify**

```bash
npm run lint
npm run lint -- --fix
npm run check
```

**Verification:**

- [ ] All linting errors resolved (use `--fix` where possible)
- [ ] No new warnings introduced
- [ ] Type checking still passes
- [ ] ESLint config works correctly (may need flat config migration)

---

### Phase 3: Testing & Verification

**Step 3.1: Full Test Suite**

```bash
npm run knip
npm run build
```

**Verification:**

- [ ] Knip finds no unused dependencies
- [ ] Production build succeeds
- [ ] Extension package creates correctly
- [ ] All tests pass (if applicable)

---

### Phase 4: Deferred Upgrades (Future)

**Prerequisites Met Checklist:**

- [ ] Svelte 5 migration completed
- [ ] Vite 8 upgrade completed
- [ ] All tests passing with new versions
- [ ] No breaking issues in production build

**Step 4.1: Upgrade Svelte Ecosystem**

```bash
npm install svelte@5.54.0 @sveltejs/vite-plugin-svelte@7.0.0
npm run build
```

**Step 4.2: Upgrade Vitest**

```bash
npm install vitest@latest
npm test
```

**Verification:**

- [ ] All Svelte components compile with Svelte 5
- [ ] Tests pass with new Vitest version
- [ ] No runtime errors in extension
- [ ] Performance is acceptable

---

## Rollback Plan

If any phase fails:

```bash
# Rollback to previous versions
git checkout HEAD -- package.json package-lock.json
npm install
npm run build
```

# Notes

- Always test in a fresh Chrome profile before deploying
- Keep `package-lock.json` committed for reproducibility
- Document any config changes in commit messages
- Consider creating a test branch for major upgrades
