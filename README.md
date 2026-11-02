# Anubis

Small, script-first consent mode library for Google/GTM aligned consent controls.

## What it does

- Shows a compact popup with quick `Accept all` and `Reject all`.
- Provides a `dialog`-based preferences UI with category toggles.
- Keeps any category marked `required: true` always on.
- Defaults to opt-in (everything denied except required categories) unless `defaultMode: 'opt-out'` is set.
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

Load the library as a plain, synchronous `<script>` in `<head>`, **before the GTM container snippet** and before any consent-gated scripts. Do not add `async`/`defer` and do not load it through GTM: Anubis sends the Consent Mode default synchronously while it is evaluated, and that only reaches Google if it happens before `gtm.js`/`gtag.js` loads.

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

<!-- GTM container snippet goes here, after Anubis -->

<!-- Gated scripts start inert and are activated by Anubis -->
<script type="text/plain" data-type="text/javascript" data-consent-category="analytics" src="https://example.com/analytics.js"></script>
<script type="text/plain" data-type="text/javascript" data-consent-category="analytics">
  console.log('inline analytics runs only after consent allows it');
</script>
```

Always mark gated scripts `type="text/plain"` and set `data-type` to the executable type to restore on activation (usually `text/javascript`). Anubis will not implicitly promote inline `text/plain` scripts when `data-type` is missing.

### What the script gate can block

| Script | Without `type="text/plain"` | With `type="text/plain"` |
| --- | --- | --- |
| In HTML **after** the Anubis script | Blocked (caught before the parser runs it) | Blocked |
| In HTML **before** the Anubis script | **Runs immediately**; flagged, never re-run | Blocked |
| Inserted by JavaScript (`appendChild`, `insertBefore`, `append`, fragments, GTM Custom HTML, tag loaders) | Blocked (intercepted before insertion) | Blocked |

To catch scripts inserted by code, Anubis wraps the DOM insertion methods (`appendChild`, `insertBefore`, `replaceChild`, `append`, `prepend`, `before`, `after`, `replaceWith`, `replaceChildren`, `insertAdjacentElement`). The wrappers only inspect nodes inserted into the live document and only act on scripts with `data-consent-category`; everything else passes straight through. Set `interceptScripts: false` to disable this, in which case script-inserted gated scripts must use `type="text/plain"`.

Scripts that could not be blocked get `data-missed="1"`, log a console warning, and emit `consent:script-missed` (`detail.reason` is `loaded-before-anubis` or `inserted-by-script`); they are never re-run. Tags managed by GTM should be gated with GTM Consent Settings, not `data-consent-category`.

### Resetting `dataLayer`

Pages should extend the dataLayer (`window.dataLayer = window.dataLayer || []; dataLayer.push({...})`) rather than reassign it. If a page does reassign it after Anubis (`dataLayer = [{...}]`), Anubis detects the replacement before the next script runs, re-sends the consent default (and any update) at the front of the new array so it still precedes GTM's `gtm.js` event, and logs a console warning.

`dist/js/consent.bundled.js` auto-injects the base structural CSS.

Use `styles` as the single customization input for Shadow Root styling:

- Pass a stylesheet URL string, for example `'/dist/css/theme-light.css'`
- Or pass an inline CSS string block

When `styles` is a stylesheet URL, the banner stays hidden until that stylesheet finishes loading (or errors), which avoids first-paint unstyled flashes.

Anubis mounts its UI in a Shadow Root by default to isolate consent UI styles from host frameworks (for example Bulma/Tailwind).

The base stylesheet (`src/css/consent.css`) also applies safe typography/control defaults inside the Anubis root (color, font-size, font-weight, line-height, form control inheritance, box sizing) to reduce inherited host-style drift. For visual customization, prefer editing theme files (`theme-light` / `theme-dark`) or overriding Anubis CSS variables instead of relying on host-page framework styles.

If you change `window.Anubis.getOptions().styles` at runtime, call `window.Anubis.refreshStyles()` (or `api.refreshStyles()` in ESM mode) to re-apply shadow-root styles.

To clear consent storage quickly during testing, call `window.Anubis.reset()` (or `api.reset()` in ESM mode). This clears the mirrored consent cookie/localStorage entry, resets in-memory consent to defaults, and reopens the consent banner.

## Source layout

- `src/js/*` → runtime, UI, storage, consent-mode, debug helper
- `src/css/consent.css` → structural-only CSS
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

- Core: `autoStart`, `version`, `defaultMode`, `storageDuration`, `storageKey`, `cookieDomain`
- Consent behavior: `defaultConsent`, `saleSharingKeys`, `unknownPolicy`, `interceptScripts`, `reloadOnRevoke`, `revokeCookies`, `respectPrivacySignal`, `waitForUpdate`, `stylesTimeout`
- Categories/mapping: `categories`, `consentMapping`
- UI/i18n: `links`, `actions`, `equalButtons`, `localeActive`, `localeFallback`, `i18n.locales`
- Google/GTM: `dataLayerName`, `adsDataRedaction`, `urlPassthrough`, `completeConsentKeys`
- Vendor integrations: `integrations.microsoftUet`, `integrations.metaPixel`
- Region: `region`, `regionResolver`, `regionTimeout`, `regionCache`, `regionKey`, `regionDuration`, `regionOverrides`

`defaultMode` baseline behavior: `opt-out` starts consent keys as `granted`, while `opt-in` starts as `denied` (required categories are still forced to granted).

`respectPrivacySignal` defaults to `true`. When enabled and the browser privacy signal is on (GPC or DNT):

- With no stored choice, consent starts denied (except required categories) and the banner shows the `gpcNotice` message. This state is not stored.
- With a stored choice made **before** the signal was on that grants anything, the signal wins: consent is denied and the banner reappears so the visitor can confirm or change their choice (CCPA regs § 7025(c)(3)).
- A choice saved **while** the signal is on is stored as acknowledged and respected on later visits without showing the banner.

Legacy `respectDoNotTrack` is still supported for backward compatibility.

`waitForUpdate` maps to Google Consent Mode `wait_for_update` on the initial `gtag('consent', 'default', ...)` call. It is omitted when a stored choice is used as the default, since no update is expected.

When `regionResolver` is set and no cached region exists yet, the default is sent as **denied** for every non-required key (with `wait_for_update`), and gated scripts stay blocked. A stored choice is also sent with `wait_for_update` in this case, since the resolved region's rules may change it. Once the region resolves, the resolved state is always sent as a `gtag('consent', 'update', ...)`, which also releases tags that are waiting.

The region lookup starts once `<body>` exists, so the update arrives roughly `time to <body>` + resolver time (capped by `regionTimeout`) after the default. Set `waitForUpdate` comfortably above `regionTimeout` (for example `regionTimeout: 1200`, `waitForUpdate: 2000`); tags that would otherwise wait past it fire with the denied default instead.

The region is cached for `regionDuration` days (`regionCache: true`). With `regionCache: false`, every page load goes through this pending path.

Settings that apply to the default (`adsDataRedaction`, `urlPassthrough`, `integrations.microsoftUet`) may be set inside `regionOverrides`; when only the resolved region enables them they are sent just before the region update.

`stylesTimeout` controls the maximum wait (in milliseconds) for a linked theme stylesheet before allowing banner display. Default is `5000`; after that the banner is shown even if the stylesheet has not loaded, so a stalled request can never hide it. `0` waits indefinitely.

`version` may be a number or a string (for example `'1.0.0'`); changing it re-prompts every visitor.

For the required-category helper label, localize the global `labelRequired` UI key.

For per-category state labels in the switch row, localize `stateActive` and `stateDisabled`.

For the GPC/DNT notice text in the banner, localize the global `gpcNotice` UI key (default `Opt-Out Request Honored`). The opt-out status text is localized with `statusOptedOut` and `statusOptedIn` (see Opt-out status).
Legacy `doNotTrackNotice` is still supported for backward compatibility.

For the DNT notice dismiss button label, localize the global `buttonCloseNotice` UI key.

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

## Opt-out status (CCPA)

California's CCPA regulations (amended effective January 1, 2026) require a business to display whether it processed a visitor's opt-out preference signal (§ 7025(c)(6)) and to give visitors a way to confirm their opt-out of sale/sharing was processed (§ 7026(g)). Anubis provides that display:

```html
<footer>
  <a href="#" data-consent="open">Your Privacy Choices</a>
  <span data-consent-status></span>
</footer>
```

Every `[data-consent-status]` element is kept up to date, including elements added after Anubis loads (footers parsed later, SPA renders):

| Status (`data-consent-status-value`) | When | Text |
| --- | --- | --- |
| `opted-out` | Every sale/sharing key is denied **and** a privacy signal was processed or the visitor saved a choice (Reject, dialog, API) | `statusOptedOut` (default `Opt-Out Request Honored`) |
| `opted-in` | The visitor saved a choice that grants any sale/sharing key | `statusOptedIn` (default empty) |
| `none` | No choice yet and no signal (a default denial is not an opt-out request), or no sale/sharing keys configured | empty |

Empty elements get the `hidden` attribute. The same `opted-out` text is shown as a status line in the preferences dialog beside the category toggles, and the status is available as `event.detail.optOutStatus` on `consent:ready`/`consent:updated` and from `Anubis.getOptOutStatus()`.

`saleSharingKeys` lists the consent keys that represent sale/sharing (default `['ad_storage', 'ad_user_data', 'ad_personalization']`, i.e. the `marketing` category). Keys not present in any category are ignored.

When a visitor with GPC consents to sale/sharing anyway (§ 7025(c)(3)), the regulations still require the status of that choice to be displayed. The dialog toggles show it; set `statusOptedIn` (for example `'Sale/sharing allowed per your choice'`) to also show it in the status elements.

The status is plain inline text, not a notification, which § 7025(f)(3) expressly permits for sites relying on frictionless GPC processing. Whether a site "sells/shares" personal information and which keys represent that is a legal determination for each site.

## Events

- `consent:ready`
- `consent:updated`
- `consent:revoked`

`consent:ready` and `consent:updated` details include `state`, `region`, `version`, `mode`, `locale`, and `optOutStatus`.

```js
document.addEventListener('consent:updated', (event) => {
  console.log(event.detail.state, event.detail.googleState);
});
```

## GTM Setup (Consent + Triggers)

The Anubis script must come before the GTM container snippet (see Quick start). Anubis then does both:

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

### Google options (all off by default)

```js
window.ConsentOptions = {
  dataLayerName: 'dataLayer',   // match a custom name used in your GTM snippet
  adsDataRedaction: true,       // gtag('set', 'ads_data_redaction', true) before the default
  urlPassthrough: true,         // gtag('set', 'url_passthrough', true) before the default
  completeConsentKeys: true,    // always send all 7 Consent Mode keys
};
```

`completeConsentKeys` sends any Google consent key not covered by a category as `denied` (`security_storage` as `granted`). Without it, a key with no category is left unset, which Google treats as unknown rather than denied. Enable it if you remove a default category (for example `preferences`).

## Other platforms

### Vendor integrations (all off by default)

```js
window.ConsentOptions = {
  integrations: {
    microsoftUet: true, // Microsoft Advertising UET Consent Mode
    metaPixel: true,    // Meta Pixel fbq('consent', 'grant' | 'revoke')
  },
};
```

Both follow `ad_storage` (the `marketing` category by default) and are sent alongside every Google default/update, so no site markup changes are needed.

- **Microsoft UET** receives `uetq.push('consent', 'default' | 'update', { ad_storage })`. UET Consent Mode only supports `ad_storage`. Required by Microsoft Advertising for EEA/UK/CH traffic.
- **Meta Pixel** receives `fbq('consent', ...)`. Meta needs it before `fbq('init')`. When the pixel loads after Anubis (including via GTM), Anubis detects the pixel snippet's `window.fbq` assignment and queues the consent call ahead of `init`. If the pixel is placed before Anubis, the consent call still arrives but after `init`, so load Anubis first. GTM's Meta Pixel community template has not been verified with this; test it in GTM Preview (confirm `fbq` exists and the `consent` call precedes `init`) before enabling `metaPixel` on a site that uses it.

### Equal button prominence

`equalButtons: true` renders Accept and Reject with the same variant in the banner and dialog: `primary` if either is primary, otherwise a plain button (a `link` variant never pulls the other one down). EU regulators (EDPB cookie banner taskforce) treat a more prominent Accept as a dark pattern. Off by default to preserve existing designs.

### Sharing consent across subdomains

`cookieDomain: '.example.com'` stores the consent and region cookies on the parent domain so `www.`, `shop.`, etc. share one choice. With it set, the cookie is the source of truth and `localStorage` is not read (it is per-subdomain and may be stale). Any older host-only copy of the cookie is expired on the next write. If the browser rejects the domain (for example on a staging or preview host outside it), Anubis falls back to a host-only cookie on that host and logs a console warning.

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
<script src="/dist/js/consent.bundled.js"></script>
<script src="/dist/js/debugger.js"></script>
```

Optional: set debugger mode before loading `debugger.js`.

```html
<script>
  window.AnubisDebugOptions = { mode: 'console' };
</script>
<script src="/dist/js/debugger.js"></script>
```

Modes:

- `panel` (default): floating UI panel
- `console`: logs live consent events, state snapshots, `dataLayer.push`, and `gtag()` activity to the browser console

The helper shows a floating bottom-right panel with:

- `State` tab: current internal consent state
- `Log` tab: consent lifecycle events
- `DataLayer` tab: recent `dataLayer` snapshot + push args (including `gtag()` wrappers)

## Examples

- `examples/anubis-options.example.json` (full baseline options; `opt-out` baseline with one explicit denied override)
- `examples/region-resolver.example.js` (resolver + region overrides)
- `examples/us-state-overrides.example.js` (US + state-level overrides)
- `examples/opt-out-except-eu-ca.example.js` (safe fallback model: default opt-in, opt-out for non-EU/non-CA)
- `examples/hubspot-consent-bridge.example.js` (bridge function: maps Anubis consent state to `window._hsp.push(['setHubSpotConsent', ...])`)

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

- On revoke (with `reloadOnRevoke`), Anubis clears cookies before reloading. By default (`revokeCookies: 'all'`) every readable first-party cookie is cleared except Anubis's own consent and region cookies, which also clears necessary cookies such as logins.
- `revokeCookies: 'registry'` clears only `cookies` registry entries whose category lost consent (`name` supports `*` wildcards, e.g. `_ga_*`). Use it only with a complete registry: unlisted cookies, and entries whose category does not match a configured category (e.g. scanner output tagged "Uncategorized" or "Performance"), are not cleared.
- Cookie clearing is best effort for first-party readable cookies on `Path=/` only.
- Third-party and HttpOnly cookies cannot be reliably cleared by client JS.

## Changelog

### v1.3.0

- Consent Mode default is now sent synchronously when the script is evaluated (previously first-visit defaults waited for `<body>` and region resolution, landing after GTM loaded).
- While `regionResolver` is pending, the default is denied and the resolved state follows as an update.
- Fixed: with a privacy signal and no stored choice, the default sent to Google could be `granted` in `opt-out` mode.
- Script gate starts synchronously and blocks parser-inserted `data-consent-category` scripts that follow Anubis.
- Scripts that ran before the gate could act (earlier in the page or inserted by JS) are flagged with `consent:script-missed` instead of being re-run on grant.
- Removed `fastDefaults` (stored choices are always applied as the default).
- GPC/DNT now overrides a stored opt-in made before the signal was on; choices made while a signal is active are stored as acknowledged and no longer re-show the banner on every page.
- Revoke never clears Anubis's own consent/region cookies. New opt-in `revokeCookies: 'registry'` clears only registered cookies in revoked categories.
- Re-activated scripts keep their CSP `nonce`.
- ESM: an explicit `startAnubis(options)` call is no longer pre-empted by autostart.
- Consent and region cookies are set with `Secure` on https.
- New opt-in options: `dataLayerName`, `adsDataRedaction`, `urlPassthrough`, `completeConsentKeys`, `equalButtons`, `cookieDomain`.
- New opt-in vendor integrations: Microsoft UET Consent Mode and Meta Pixel consent (`integrations.microsoftUet`, `integrations.metaPixel`).
- Debug helper follows `ConsentOptions.dataLayerName`.
- Script gate intercepts DOM insertion so scripts inserted by code (including `async` vendor loaders and fragments) are blocked before they run (`interceptScripts: false` to disable).
- A page that reassigns `dataLayer` after Anubis no longer loses consent signals: the default is re-sent ahead of GTM and the `gtag` shim resolves the dataLayer on every call.
- Fixed: string `version` values (e.g. `'1.0.0'`) never matched, so choices were never remembered.
- `window.Anubis` is available inside `consent:ready` listeners.
- `stylesTimeout` now defaults to `5000` ms (was unbounded).
- `cookieDomain` falls back to a host-only cookie when the browser rejects the domain.
- Region-pending defaults keep `wait_for_update` even with a stored choice, and the post-resolution update is always sent.
- A choice saved under DNT no longer acknowledges a later GPC signal.
- Site `<a href data-consent>` triggers no longer navigate.
- CCPA opt-out status display: `[data-consent-status]` elements, a dialog status line, `optOutStatus` in event details, `Anubis.getOptOutStatus()`, and the `saleSharingKeys` option.
- Default `gpcNotice` text is now `Opt-Out Request Honored` (the current CCPA regulation example; was `Opt-Out Signal Honored.`).
- The preferences dialog's privacy-signal notice is replaced by the opt-out status line, shown whenever sale/sharing is opted out.
- Fixed: `hasStoredConsent` was not updated after a choice was saved in the same page view.
- Demo: GPC on/off switch, opt-out status panel, and a footer "Your Privacy Choices" link with live status.

### v1.2.2

- Dynamic viewport sizing. 

### v1.2.0

- Refined privacy-signal UX to use a single main banner:
  - Removed the separate GPC/DNT notice banner.
  - Shows the `gpcNotice` message inline in the normal banner.
  - Keeps the same notice visible in the preferences dialog.
- Updated privacy-signal behavior to preserve user choice controls:
  - Users can still open preferences and submit consent choices while a signal is active.
  - Signal-based defaults are applied in memory and are no longer auto-persisted as stored consent.
- Improved late privacy-signal detection consistency:
  - Added non-blocking watcher checks across early timeouts and page lifecycle events (`visibilitychange`, `pageshow`).
  - Banner renders immediately, then updates notice/state when delayed GPC/DNT becomes available.
- Enhanced debug helper `State` tab:
  - Added explicit `GPC` and `DNT` status rows, including raw values when available.


### v1.1.1

- Fixed privacy-signal notice behavior so dismissing the GPC/DNT banner is persisted.
- The GPC/DNT notice banner now appears on first load only (when a privacy signal is active) and stays hidden on subsequent page loads after dismissal.
- Resetting consent state (`window.Anubis.reset()` / `api.reset()`) clears the dismissal state, allowing the notice to appear again when applicable.

### v1.1.0

- Added Global Privacy Control (GPC) signal handling (alongside DNT) when `respectPrivacySignal` is enabled.
- Renamed notice copy key from `doNotTrackNotice` to `gpcNotice`.
- Kept backward compatibility by still reading legacy `doNotTrackNotice` if `gpcNotice` is not provided.
- Updated the preferences dialog behavior when a privacy signal is honored:
  - Shows the same privacy-signal notice text in the dialog body.
  - Disables all category toggles and prevents consent changes.
  - Hides footer actions so only the header close button remains.
