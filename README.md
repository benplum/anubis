# Anubis Consent Library

Small, script-first consent mode library for Google/GTM aligned consent controls.

## What it does

- Shows a compact popup with quick `Accept all` and `Reject all`.
- Provides a `dialog`-based preferences UI with category toggles.
- Keeps `necessary` category always on.
- Defaults to opt-out unless configured otherwise.
- Pushes consent defaults/updates to `dataLayer`, and uses `gtag('consent', ...)` when available.
- Gates scripts with `data-consent-category` via `MutationObserver`.
- Emits custom consent lifecycle events.

## Category defaults

```js
window.AnubisOptions = {
  categories: {
    necessary: ['security_storage'],
    marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
    analytics: ['analytics_storage'],
    preferences: ['functionality_storage', 'personalization_storage']
  }
};
```

## Quick start

Load the library first on page, before tag scripts that should be consent-gated.

```html
<script>
  window.AnubisOptions = {
    defaultConsentMode: 'opt-out',
    version: 1,
    links: {
      privacyPolicyUrl: '/privacy',
      cookiePolicyUrl: '/cookies'
    }
  };
</script>
<script src="/dist/anubis.js"></script>

<script data-consent-category="analytics" src="https://example.com/analytics.js"></script>
```

## `window.AnubisOptions`

```ts
type GrantState = 'granted' | 'denied';

interface AnubisOptions {
  autoStart?: boolean;
  version?: number;
  storageKey?: string;
  cookieDays?: number;
  defaultConsentMode?: 'opt-in' | 'opt-out';
  fastDefaultFromStorage?: boolean; // default true
  defaultConsentOverrides?: Record<string, GrantState>;
  unknownCategoryPolicy?: 'block' | 'allow';
  reloadOnRevoke?: boolean;

  categories?: Record<string, string[]>;
  consentMapping?: Record<string, string>;

  activeLocale?: string;
  fallbackLocale?: string;
  i18n?: {
    activeLocale?: string;
    fallbackLocale?: string;
    locales?: Record<string, any>;
  };

  links?: {
    privacyPolicyUrl?: string;
    cookiePolicyUrl?: string;
  };

  actions?: {
    banner?: ConsentAction[];
    dialog?: {
      header?: ConsentAction[];
      footer?: ConsentAction[];
    };
  };

  region?: string;
  resolveRegion?: () => Promise<string> | string;
  resolveRegionTimeoutMs?: number;
  regionCache?: {
    enabled?: boolean; // default true
    storage?: 'localStorage' | 'sessionStorage'; // default 'localStorage'
    key?: string; // default 'anubis-region-cache'
    ttlSeconds?: number; // default 86400 (24h)
  };
  regionOverrides?: Record<string, Partial<AnubisOptions>>;
}

interface ConsentAction {
  id: 'open' | 'accept-all' | 'reject-all' | 'save' | 'close';
  variant?: 'primary' | 'secondary' | 'link' | 'icon';
  label?: string;
  labelKey?: string;
  closeDialog?: boolean;
  visible?: boolean;
}
```

`resolveRegion` lookups are cached by default (`regionCache.enabled: true`) to avoid repeated network calls.

`actions` lets teams control which built-in buttons render in banner/dialog and in what order.

### Defaults precedence

1. Base options
2. Region override chain (broad to specific, e.g. `US` then `US-CA`)
3. Stored user choice (if `version` matches)

`regionOverrides` supports state/province level keys when `region` (or `resolveRegion`) returns a composite code like `US-CA`.
Region values are normalized to uppercase with `-` separators (so `us_ca`, `us-ca`, and `US-CA` are treated the same).

Example (CCPA / CPRA style):

```js
window.AnubisOptions = {
  resolveRegion: async () => 'US-CA',
  regionOverrides: {
    US: {
      links: {
        privacyPolicyUrl: '/privacy-us',
      },
    },
    'US-CA': {
      defaultConsentMode: 'opt-out',
      actions: {
        banner: [
          { id: 'reject-all', variant: 'secondary', label: 'Reject all' },
          { id: 'accept-all', variant: 'primary', label: 'Accept all' },
          { id: 'open', variant: 'link', label: 'Your Privacy Choices' },
        ],
      },
    },
  },
};
```

## i18n options

Library selects strings in this order:

1. `activeLocale` / `i18n.activeLocale`
2. `navigator.language` match
3. `fallbackLocale` / `i18n.fallbackLocale`
4. Built-in English strings

## Consent triggers

Use attributes on custom UI elements:

```html
<button data-consent-trigger="open">Privacy settings</button>
<button data-consent-trigger="accept-all">Allow all</button>
<button data-consent-trigger="reject-all">Reject all</button>
<button data-consent-trigger="save">Save choices</button>
```

## Events

- `consent:ready`
- `consent:changed`
- `consent:revoked`

```js
document.addEventListener('consent:changed', (event) => {
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

- `event: 'cmp_consent_default'`
- `cmpCommand: 'default'`
- `cmpConsent` object with consent keys
- flattened consent keys at top-level (for GTM variable access)
- `cmpRegion`, `cmpVersion`

On update:

- `event: 'cmp_consent_update'`
- `cmpCommand: 'update'`
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
  - `cmp_consent_default`
  - `cmp_consent_update`
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

- `dist/anubis.esm.js`
- `dist/anubis.js` (includes style injection)
- `dist/anubis-debug.js` (debug panel helper)
- `dist/anubis.css`

## Debug Helper

Include this only in development/debug sessions:

```html
<script src="/dist/anubis.js"></script>
<script src="/dist/anubis-debug.js"></script>
```

The helper shows a floating bottom-right panel with:

- `Consent` tab: current internal consent state as red/green tokens + consent event log
- `DataLayer` tab: recent `dataLayer` snapshot and new pushes as they happen

## Demo

```bash
npm install
npm run build
python3 -m http.server 4173
```

Then open `http://localhost:4173/demo/`.

## Notes / limits

- On revoke, cookie clearing is best effort for first-party readable cookies only.
- Third-party and HttpOnly cookies cannot be reliably cleared by client JS.
