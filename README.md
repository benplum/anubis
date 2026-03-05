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
    consentVersion: 1,
    links: {
      privacyPolicyUrl: '/privacy',
      cookiePolicyUrl: '/cookies'
    }
  };
</script>
<script src="/dist/anubis.iife.js"></script>

<script data-consent-category="analytics" src="https://example.com/analytics.js"></script>
```

## `window.AnubisOptions`

```ts
type GrantState = 'granted' | 'denied';

interface AnubisOptions {
  autoStart?: boolean;
  consentVersion?: number;
  storageKey?: string;
  cookieDays?: number;
  defaultConsentMode?: 'opt-in' | 'opt-out';
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
2. Region override
3. Stored user choice (if `consentVersion` matches)

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

## Build

```bash
npm install
npm run build
```

Outputs:

- `dist/anubis.esm.js`
- `dist/anubis.iife.js` (includes style injection)
- `dist/anubis-debug.iife.js` (debug panel helper)
- `dist/anubis.css`

## Debug Helper

Include this only in development/debug sessions:

```html
<script src="/dist/anubis.iife.js"></script>
<script src="/dist/anubis-debug.iife.js"></script>
```

The helper shows a floating bottom-right panel with:

- current internal consent state as red/green tokens
- event log entries for `consent:ready`, `consent:changed`, and `consent:revoked`

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
