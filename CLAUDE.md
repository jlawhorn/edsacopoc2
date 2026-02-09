# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Edge Delivery Services (EDS) + Adobe Commerce storefront. This is a content-driven e-commerce frontend that runs on Adobe's EDS platform, backed by Adobe Commerce (Magento) via GraphQL. Content is authored in SharePoint/Google Docs and mapped via `fstab.yaml`.

Live site: `https://main--edsacopoc2--jlawhorn.aem.live/`

## Commands

- **Local dev server:** `npm start` (runs `aem up`, requires `@adobe/aem-cli`)
- **Lint all:** `npm run lint`
- **Lint JS only:** `npm run lint:js`
- **Lint CSS only:** `npm run lint:css`
- **Lint with autofix:** `npm run lint:fix`
- **Install/update drop-ins:** `npm run install:dropins` (also runs automatically via `postinstall`)

After updating a specific `@dropins/*` package, you must manually run `npm run postinstall` — npm does not trigger `postinstall` for targeted installs.

There are no unit test scripts defined. E2E tests use Cypress with configs in `cypress/` (base, paas, saas variants).

## Architecture

### Page Loading Lifecycle

The page loads through a three-phase pipeline defined in `scripts/scripts.js`:

1. **`loadEager`** — Initializes commerce config (`initializeCommerce` → fetches `config.json` → initializes drop-ins), decorates the main element (links, buttons, icons, sections, blocks), loads first section with LCP optimization.
2. **`loadLazy`** — Loads remaining sections, header/footer blocks, commerce lazy features (modals, Adobe Client Data Layer).
3. **`loadDelayed`** — Fires after 3s; loads analytics (commerce events SDK/collector) via `scripts/delayed.js`.

### Block-Based Architecture

Every UI component is a **block** — a directory under `blocks/` containing `{name}.js` and `{name}.css`. Blocks are auto-discovered from DOM class names and loaded dynamically by `aem.js`. A block's default export receives the block DOM element and decorates it.

```
blocks/product-details/
  product-details.js    # export default async function decorate(block) { ... }
  product-details.css
```

Content authored in the CMS becomes HTML table structures that get decorated into blocks. The `aem.js` core handles the decoration pipeline: `decorateSections` → `decorateBlocks` → `loadBlock` (imports JS + CSS per block).

### Commerce Integration

- **`scripts/commerce.js`** — Central commerce module. Handles config initialization from `config.json` (cached in sessionStorage with 2hr expiry), page type detection (Product/Category/Cart/Checkout/CMS), Adobe Data Layer setup, link localization, and placeholder fetching.
- **`scripts/initializers/`** — Each commerce feature has an initializer (auth, cart, checkout, pdp, wishlist, etc.). The main `index.js` sets up global state: auth headers, GraphQL endpoint, event bus, then imports auth and personalization initializers eagerly, cart lazily.
- **`initializeDropin(cb)`** helper in `scripts/initializers/index.js` wraps initializer callbacks with re-initialization on prerendering changes and guards against duplicate init.

### Drop-in Components

Pre-built `@dropins/*` packages provide commerce UI (cart, checkout, PDP, account, etc.). These use **Preact** under the hood.

- Source lives in `node_modules/@dropins/` but gets copied to `scripts/__dropins__/` by `postinstall.js` so EDS can serve them as static files.
- An **import map** in `head.html` maps `@dropins/storefront-*/` to `/scripts/__dropins__/storefront-*/`.
- Drop-ins are rendered via their `render.js` API: `render(Container, props)(domElement)`.
- Customization is done through **slots** (named render callbacks) and **labels** (fetched from placeholders JSON files).

### GraphQL Operations

`build.mjs` uses `@dropins/build-tools` to override GraphQL fragments at build time (e.g., skipping downloadable item fragments for ACCS). To customize a drop-in's GraphQL queries, add entries to the `overrideGQLOperations` array in `build.mjs`.

### Event Bus

Drop-ins communicate via `@dropins/tools/event-bus.js`. Key events:
- `aem/lcp` — page reached LCP, triggers eager rendering
- `authenticated` — user auth state changed
- `cart/data` — cart data updated
- `pdp/data`, `pdp/valid`, `pdp/values` — product detail page lifecycle

### Configuration

- **`config.json`** — Commerce endpoints, API headers (environment ID, store codes), analytics config. Structured under `public.default`.
- **`fstab.yaml`** — Content mount points (maps `/` to DA Live content source).
- **`head.html`** — Global HTML head: CSP policy, import map, script/CSS loads, modulepreload hints.

## Code Conventions

### JavaScript
- ESLint with `airbnb-base` config and Babel parser
- **File extensions required in imports:** `import { foo } from './bar.js'`
- `console.log` is disallowed; use `console.warn`, `console.error`, `console.info`, or `console.debug`
- Unused variables prefixed with `_` are allowed (`argsIgnorePattern: '^_'`)
- Underscore-prefixed properties are allowed (`no-underscore-dangle: off`)
- Param property reassignment is allowed (`no-param-reassign: props: false`)

### CSS
- StyleLint with `stylelint-config-standard`
- `selector-class-pattern` is disabled (no enforced naming convention)
- Media feature range notation uses prefix syntax (`min-width` not range)

### Files excluded from linting (`.eslintignore`)
`scripts/__dropins__/`, `scripts/acdl/`, `tools/picker/`, `tools/segments/`, `tools/pdp-metadata/`, `scripts/commerce-events-*.js`, `plugins/`, `cypress/`

### Files excluded from EDS deployment (`.hlxignore`)
`*.md`, `*.map`, `*.d.ts`, `package.json`, `package-lock.json`, `postinstall.js`, `build.mjs`, `cypress/`, `test/`, `tools/picker/src/`, `tools/pdp-metadata/`

## Important Gotchas

- **`scripts/__dropins__/` is generated.** Never edit files there; they are overwritten by `npm run postinstall`. Modify drop-in behavior through slots, event handlers, and GraphQL overrides in `build.mjs`.
- **`scripts/aem.js` is managed by Adobe.** There is a GitHub Actions workflow (`protect-aem-js.yaml`) that guards this file. Do not modify it.
- **No bundler.** EDS serves files directly — all imports must use browser-compatible ES modules with `.js` extensions. The import map in `head.html` handles `@dropins/*` resolution.
- **Config is session-cached.** `config.json` is fetched once and stored in sessionStorage for 2 hours. Clear sessionStorage when testing config changes locally.
