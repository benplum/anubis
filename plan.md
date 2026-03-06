Plan: Minimal Consent Mode Library (v3)

Build a small, script-first consent library with a quick accept/reject popup plus a details dialog using accessible HTML (`dialog`) and `anubis-` class prefixing, defaulting to opt-out except locked “necessary.”

The implementation aligns to Consent Mode v2 by auto-detecting `gtag` and falling back to `dataLayer`, always signaling `security_storage: 'granted'` for necessary, and sending default + update consent states.

Preferences persist in both cookie and localStorage for 180 days, and stay in sync as preferences change. Script gating uses `data-consent-category` plus a `MutationObserver`, with blocked scripts reinserted as executable nodes on grant; on revoke, clear accessible cookies and reload.

All consent categories, consent-mode mappings, consent defaults, default opt-in/out mode, and UI text are configurable through `window.ConsentOptions`.

Steps

* Define architecture and constants in `src/index.js`: category map (marketing, analytics, preferences, locked necessary), Google key mapping, defaults (denied except necessary), storage keys, TTL.
* Implement config parsing and normalization in `src/config.js`: read `window.ConsentOptions`, merge with defaults, validate shape, and freeze effective config.
* Add configurable consent model in `src/config.js` and `src/consent-mode.js`: support `defaultMode: 'opt-in' | 'opt-out'` plus per-key overrides.
* Implement persistence adapter in `src/storage.js`: read precedence, dual-write (cookie + localStorage), 180-day expiry, corruption-safe parse fallback to defaults.
* Implement consent signaling in `src/consent-mode.js`: `applyDefaultConsent()` at bootstrap, `applyUpdatedConsent()` on save, auto-detect `window.gtag` else `dataLayer.push`, include `security_storage: 'granted'`.
* Build UI renderer in `src/ui.js`: compact banner (accept/reject/manage), details dialog with category toggles, disabled necessary toggle, semantic labels, focus return, ESC/close handling.
* Add translation pipeline in `src/ui.js`: all copy from options-driven i18n dictionary (active locale override, locale auto-pick, fallback locale).
* Add base theming in `src/styles.css`: CSS custom properties only, `anubis-` prefixed classes, minimal footprint; inject once from runtime for bundled IIFE.
* Implement script gate in `src/script-gate.js`: scan + observe `script[data-consent-category]`, convert blocked scripts to inert form, reinsert executable clones on grant, track executed ids to avoid duplicates.
* Preserve script attributes on reinsert (`nonce`, `integrity`, `crossorigin`, `referrerpolicy`, `async`, `defer`) for CSP/security compatibility.
* Implement revoke behavior in `src/runtime.js`: detect granted→denied transitions, clear first-party non-HttpOnly cookies best-effort, emit revoke event, then `location.reload()` guarded by config.
* Implement events/triggers in `src/events.js`: dispatch custom events (`consent:ready`, `consent:changed`, `consent:revoked`), bind click handlers for `[data-consent]` (`open`, `accept`, `reject`, `save`).
* Add optional geo-based config in `src/runtime.js`: support async `regionResolver()` with timeout + fallback to `ConsentOptions.region`, then apply region overrides before rendering.
* Provide outputs and packaging in `package.json` and `build.config.js`: ESM source + bundled IIFE artifact with optional style injection, small-size build settings.
* Document integration in `README.md`: load-order requirements (first script, blocking), required attributes (`data-consent-category`, `data-consent`), GTM/Consent Mode behavior, cookie-clearing limitations.

Verification

Unit: storage roundtrip, consent mapping, transition detection, script-gate clone/reinsert behavior.
Browser manual: first load defaults denied, banner/dialog accessibility, trigger attributes, update/revoke event emission.
GTM checks: confirm default consent pushed before tags, then update pushes on save.
Revoke checks: granted→denied clears accessible cookies and reloads; blocked scripts remain inert after reload until re-grant.
Config checks: mode/override precedence, invalid options fallback, i18n locale/fallback logic.
Geo checks: resolver success/failure/timeout + deterministic fallback.

Decisions

Google signaling: auto-detect gtag, fallback to dataLayer.
Necessary handling: internal locked category + always `security_storage: 'granted'`.
Persistence: cookie + localStorage, 180-day TTL.
Script execution on grant: reinsert executable script nodes (not just type flip).
Config entrypoint: `window.ConsentOptions`.
Default model: `defaultMode` + per-key overrides.
Translations: locales map with active locale override + auto-pick + fallback.
Location support: async resolver callback with `ConsentOptions.region` fallback.

Start-Today Additions

Config hardening

* Add `version` to `window.ConsentOptions`; if saved version differs, reset to defaults and re-show banner.
* Add `unknownPolicy: 'block' | 'allow'` (default `'block'`) for missing/invalid `data-consent-category` values.
* Define deterministic precedence: base options → region override → persisted user choice.

Security/runtime

* Preserve script attributes when reinserting (`nonce`, `integrity`, `crossorigin`, `referrerpolicy`, `async`, `defer`).
* Add geo resolver guardrails: timeout, failure fallback path, and documented defaults.

Content/i18n

* Add configurable legal metadata and links (`links.actions`, optional `bannerDescription`).
* Add missing-key fallback order: active locale → fallback locale → built-in English.

Non-goals (v1)

* No guaranteed cookie-to-category attribution; only best-effort first-party cookie clearing on revoke.

Nice-to-have (phase 2)

* Optional category-specific cookie registry configured by implementer for more targeted revoke cleanup.
* Optional debug mode for verbose consent-state and script-gating logs.
