# Anubis

Small, script-first consent mode library for Google/GTM aligned consent controls.

## What it does

- Shows a compact popup with quick `Accept all` and `Reject all`.
- Provides a `dialog`-based preferences UI with category toggles.
- Keeps any category marked `required: true` always on.
- Defaults to opt-out unless configured otherwise.
- Pushes consent defaults/updates to `dataLayer`, and uses `gtag('consent', ...)` when available.
- Gates scripts with `data-consent-category` via `MutationObserver`.
- Emits custom consent lifecycle events.

## Category defaults

```js
window.ConsentOptions = {
  categories: {
    necessary: { consent: ['security_storage'], required: true },
    marketing: { consent: ['ad_storage', 'ad_user_data', 'ad_personalization'], required: false },
    analytics: { consent: ['analytics_storage'], required: false },
    preferences: { consent: ['functionality_storage', 'personalization_storage'], required: false },
  }
};
```

`required: true` locks that category on and shows the always-active label in the UI. Multiple categories can be marked required.

## Quick start

Load the library first on page, before tag scripts that should be consent-gated.

```html
<script>
  window.ConsentOptions = {
    defaultMode: 'opt-out',
    version: 1,
    styles: '/dist/css/theme-light.css',
    className: 'brand-consent',
    links: [
      { title: 'Privacy policy', url: '/privacy' },
      { title: 'Cookie policy', url: '/cookies' }
    ]
  };
</script>
<script src="/dist/js/consent.bundled.js"></script>

<script data-consent-category="analytics" src="https://example.com/analytics.js"></script>
```

`dist/js/consent.bundled.js` auto-injects the base structural CSS. Use `styles` (single CSS URL string) to load a theme stylesheet into the Shadow Root.

You can also provide hidden style sources in the host document:

```html
<template id="consent-styles">
  <style>
    /* base overrides */
  </style>
</template>

<template id="consent-theme">
  <style>
    /* theme overrides */
  </style>
  <!-- or: <link rel="stylesheet" href="/dist/css/theme-dark.css"> -->
</template>
```

Anubis looks for `#consent-styles` (base CSS fallback) and `#consent-theme` (theme inline CSS and/or theme stylesheet href) and injects those into the Shadow Root.

Anubis mounts its UI in a Shadow Root by default to isolate consent UI styles from host frameworks (for example Bulma/Tailwind).

The base stylesheet (`src/css/base.css`) also applies safe typography/control defaults inside the Anubis root (color, font-size, font-weight, line-height, form control inheritance, box sizing) to reduce inherited host-style drift. For visual customization, prefer editing theme files (`theme-light` / `theme-dark`) or overriding Anubis CSS variables instead of relying on host-page framework styles.

If you change `window.Anubis.getOptions().styles` at runtime, call `window.Anubis.refreshStyles()` (or `api.refreshStyles()` in ESM mode) to re-apply shadow-root styles.

## Source layout

- `src/js/*` → runtime, UI, storage, consent-mode, debug helper
- `src/css/base.css` → structural-only CSS
- `src/css/theme-light.css` / `src/css/theme-dark.css` → paint/theme layers

## `window.ConsentOptions` (IIFE-first)

Most teams use the global options object before loading `dist/js/consent.bundled.js`.

```js
window.ConsentOptions = {
  autoStart: true,
  version: 1,
  defaultMode: 'opt-out', // or 'opt-in'
  waitForUpdate: 500,
  storageDuration: 180,
  storageKey: 'consent-options',

  links: [
    { title: 'Privacy policy', url: '/privacy' },
    { title: 'Cookie policy', url: '/cookies' },
  ],

  styles: '/dist/css/theme-light.css',
  className: 'brand-a-consent',

  categories: {
    necessary: { consent: ['security_storage'], required: true },
    marketing: { consent: ['ad_storage', 'ad_user_data', 'ad_personalization'], required: false },
    analytics: { consent: ['analytics_storage'], required: false },
    preferences: { consent: ['functionality_storage', 'personalization_storage'], required: false },
  },
};
```

`links` supports any number of banner links (`title` + `url`).

Common options:

- `className` → optional custom class (or space-separated classes) added to the shadow-root container element (which already includes `root`).

- Core: `autoStart`, `version`, `defaultMode`, `storageDuration`, `storageKey`
- Consent behavior: `defaultConsent`, `unknownPolicy`, `reloadOnRevoke`, `respectDoNotTrack`, `waitForUpdate`
- Categories/mapping: `categories`, `consentMapping`
- UI/i18n: `links`, `actions`, `localeActive`, `localeFallback`, `i18n.locales`
- Region: `region`, `regionResolver`, `regionTimeout`, `regionCache`, `regionKey`, `regionDuration`, `regionOverrides`

`defaultMode` baseline behavior: `opt-out` starts consent keys as `granted`, while `opt-in` starts as `denied` (required categories are still forced to granted).

`respectDoNotTrack` defaults to `true`. When enabled and the browser DNT signal is on, Anubis initializes consent as denied (except required categories), stores that state, and suppresses the first-run banner.

`waitForUpdate` maps to Google Consent Mode `wait_for_update` on the initial `gtag('consent', 'default', ...)` call.

For the required-category helper label, localize the global `requiredLabel` UI key.

`consentMapping` is optional and only needed when your internal consent keys differ from Google Consent Mode keys. If your category `consent` lists already use Google keys (for example `analytics_storage`, `ad_storage`), you can omit `consentMapping`.

## ESM (advanced)

If you are bundling with Vite/Webpack/Rollup, use ESM:

```js
import startAnubis from '/dist/js/consent.esm.js';

startAnubis({
  defaultMode: 'opt-out',
  version: 1,
});
```

`regionResolver` lookups are cached by default (`regionCache: true`) and mirrored to both cookie + localStorage.

`actions` lets teams control which built-in buttons render in banner/dialog and in what order.

### Defaults precedence

1. Base options
2. Region override chain (broad to specific, e.g. `US` then `US-CA`)
3. Stored user choice (if `version` matches)

`regionOverrides` supports state/province level keys when `region` (or `regionResolver`) returns a composite code like `US-CA`.
Region values are normalized to uppercase with `-` separators (so `us_ca`, `us-ca`, and `US-CA` are treated the same).

Example (CCPA / CPRA style):

```js
window.ConsentOptions = {
  regionResolver: async () => 'US-CA',
  regionOverrides: {
    US: {
      links: [
        { title: 'Privacy policy', url: '/privacy-us' },
      ],
    },
    'US-CA': {
      defaultMode: 'opt-out',
      actions: {
        banner: [
          { id: 'reject', label: 'Reject all' },
          { id: 'accept', variant: 'primary', label: 'Accept all' },
          { id: 'open', variant: 'link', label: 'Your Privacy Choices' },
        ],
      },
    },
  },
};
```

## i18n options

Library selects strings in this order:

1. `localeActive` / `i18n.localeActive`
2. `navigator.language` match
3. `localeFallback` / `i18n.localeFallback`
4. Built-in English strings

## Consent triggers

Use attributes on custom UI elements:

```html
<button data-consent="open">Privacy settings</button>
<button data-consent="accept">Allow all</button>
<button data-consent="reject">Reject all</button>
<button data-consent="save">Save choices</button>
```

## Events

- `consent:ready`
- `consent:updated`
- `consent:revoked`

```js
document.addEventListener('consent:updated', (event) => {
  console.log(event.detail.state, event.detail.googleState);
});
```

## GTM Setup (Consent + Triggers)

Anubis does both:

- Sends Google Consent Mode commands (`gtag('consent', 'default'|'update', ...)`) when `gtag` exists.
- Pushes custom `dataLayer` events every time consent default/update is applied.

If `gtag` is not present, Anubis creates a Google-style fallback shim:

```js
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
```

Then consent commands still execute through `gtag('consent', ...)` and land in `dataLayer`.

### What is pushed to `dataLayer`

On default:

- `event: 'consent_default'`
- `consentCommand: 'default'`
- `consentState` object with consent keys
- flattened consent keys at top-level (for GTM variable access)
- `consentRegion`, `consentVersion`

On update:

- `event: 'consent_update'`
- `consentCommand: 'update'`
- same payload fields as above

### Recommended GTM pattern (primary)

Use GTM Consent Settings to block/fire tags by consent key:

1. In GTM, open each tag and configure Consent Settings.
2. Require the relevant consent types, for example:
  - Ads tags: `ad_storage` (+ `ad_user_data`, `ad_personalization` when needed)
  - Analytics tags: `analytics_storage`
  - Preference/personalization tags: `functionality_storage` / `personalization_storage`
3. Publish container.

This is the preferred approach for consent gating in GTM.

### Optional custom trigger pattern

If you need custom logic, use Anubis `dataLayer` events:

1. Create GTM Event Triggers:
  - `consent_default`
  - `consent_update`
2. Create Data Layer Variables for keys you care about (for example `analytics_storage`, `ad_storage`).
3. Add trigger conditions such as:
  - fire only when `analytics_storage` equals `granted`
  - block or exception when `ad_storage` equals `denied`

### Category mapping reference

- `marketing` → `ad_storage`, `ad_user_data`, `ad_personalization`
- `analytics` → `analytics_storage`
- `preferences` → `functionality_storage`, `personalization_storage`
- `necessary` → `security_storage` (always granted)

## Build

```bash
npm install
npm run build
```

Outputs:

- `dist/js/consent.esm.js`
- `dist/js/consent.js` (lean IIFE runtime, no structural CSS injection)
- `dist/js/consent.bundled.js` (IIFE runtime + structural style injection)
- `dist/js/debugger.js` (debug panel helper)
- `dist/css/consent.css` (structural CSS only)
- `dist/css/theme-light.css` (default paint/theme layer)
- `dist/css/theme-dark.css` (dark paint/theme layer)

## Debug Helper

Include this only in development/debug sessions:

```html
<link rel="stylesheet" href="/dist/css/theme-light.css" />
<script src="/dist/js/consent.bundled.js"></script>
<script src="/dist/js/debugger.js"></script>
```

The helper shows a floating bottom-right panel with:

- `State` tab: current internal consent state
- `Log` tab: consent lifecycle events
- `DataLayer` tab: recent `dataLayer` snapshot + push args (including `gtag()` wrappers)

## Examples

- `examples/anubis-options.example.json` (full baseline options; `opt-out` baseline with one explicit denied override)
- `examples/region-resolver.example.js` (resolver + region overrides)
- `examples/us-state-overrides.example.js` (US + state-level overrides)
- `examples/opt-out-except-eu-ca.example.js` (safe fallback model: default opt-in, opt-out for non-EU/non-CA)

## Demo

```bash
npm install
npm run build
python3 -m http.server 4173
```

Then open `http://localhost:4173/demo/`.

Demo includes:

- Preset selector (`default`, `dialog-first`, `accept-only`, `opt-out-except-eu-ca`)
- Theme selector (`none`, `light`, `dark`) via query param `?theme=`
- Developer triggers and live event/state logging
- In-browser configurator at `demo/configurator.html` (left-side options, right-side preview + JSON)

Demo pages (`index`, `preview`, `configurator`) use Bulma CSS from CDN for baseline styling:

- `https://cdn.jsdelivr.net/npm/bulma@1.0.2/css/bulma.min.css`

## Notes / limits

- On revoke, cookie clearing is best effort for first-party readable cookies only.
- Third-party and HttpOnly cookies cannot be reliably cleared by client JS.
