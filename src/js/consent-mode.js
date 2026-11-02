const GOOGLE_CONSENT_KEYS = [
  'ad_storage',
  'ad_user_data',
  'ad_personalization',
  'analytics_storage',
  'functionality_storage',
  'personalization_storage',
  'security_storage',
];

let currentOptions = null;
let signaledDataLayer = null;
let defaultRecord = null;
let latestUpdateRecord = null;
let warnedReplacedDataLayer = false;
const sentExtras = { adsDataRedaction: false, urlPassthrough: false, uetDefault: false };

// GTM only treats real Arguments objects (not arrays) as gtag commands.
function toArguments() {
  return arguments;
}

function getDataLayerName(options) {
  const name = options && typeof options.dataLayerName === 'string' ? options.dataLayerName.trim() : '';
  return name || 'dataLayer';
}

function ensureDataLayer(options) {
  if (typeof window === 'undefined') {
    return null;
  }
  const name = getDataLayerName(options);
  if (!Array.isArray(window[name])) {
    window[name] = [];
  }
  return window[name];
}

function ensureGtag(options) {
  if (typeof window === 'undefined') {
    return false;
  }

  ensureDataLayer(options);

  // Resolve the dataLayer on every call, like Google's own snippet, so a page that
  // reassigns it still receives later commands.
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      ensureDataLayer(currentOptions).push(arguments);
    };
  }

  return typeof window.gtag === 'function';
}

function googleTagLoaded() {
  return typeof window !== 'undefined' && Boolean(window.google_tag_manager || window.google_tag_data);
}

function buildDataLayerEvent(command, consent, options) {
  return {
    event: command === 'default' ? 'consent_default' : 'consent_update',
    consentCommand: command,
    consentState: { ...consent },
    consentRegion: options.region || '',
    consentVersion: options.version,
    ...consent,
  };
}

// Re-signal consent when the page replaced the dataLayer after Anubis ran (for
// example `dataLayer = [{...}]` before the GTM snippet) or a region override renamed
// it. Before GTM loads, commands go to the front so they precede the gtm.js event.
export function reconcileDataLayer() {
  if (!defaultRecord || typeof window === 'undefined') {
    return false;
  }
  const name = getDataLayerName(currentOptions);
  if (window[name] === signaledDataLayer && Array.isArray(signaledDataLayer)) {
    return false;
  }

  const dataLayer = ensureDataLayer(currentOptions);
  const items = [];
  if (currentOptions.adsDataRedaction === true) {
    items.push(toArguments('set', 'ads_data_redaction', true));
  }
  if (currentOptions.urlPassthrough === true) {
    items.push(toArguments('set', 'url_passthrough', true));
  }
  items.push(toArguments('consent', 'default', defaultRecord.consent));
  items.push(buildDataLayerEvent('default', defaultRecord.consent, defaultRecord.options));
  if (latestUpdateRecord) {
    items.push(toArguments('consent', 'update', latestUpdateRecord.consent));
    items.push(buildDataLayerEvent('update', latestUpdateRecord.consent, latestUpdateRecord.options));
  }

  if (googleTagLoaded()) {
    items.forEach((item) => dataLayer.push(item));
  } else {
    dataLayer.unshift(...items);
  }
  signaledDataLayer = dataLayer;

  if (!warnedReplacedDataLayer && typeof console !== 'undefined' && console.warn) {
    warnedReplacedDataLayer = true;
    console.warn(`[Anubis] window.${name} was replaced after consent was signaled; consent was re-sent. Use \`${name} = ${name} || []\` and push() instead of reassigning it.`);
  }
  return true;
}

// While the page parses, observer callbacks run before each parser-inserted script
// executes, so a replaced dataLayer is repaired before the GTM snippet runs.
export function watchDataLayerDuringParse() {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined' || document.readyState !== 'loading') {
    return;
  }
  const observer = new MutationObserver(() => {
    reconcileDataLayer();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => {
    observer.disconnect();
    reconcileDataLayer();
  }, { once: true });
}

// Keys not covered by any category are otherwise left unset, which Google treats
// as unknown rather than denied.
function completeConsent(consent) {
  const out = { ...consent };
  GOOGLE_CONSENT_KEYS.forEach((key) => {
    if (!out[key]) {
      out[key] = key === 'security_storage' ? 'granted' : 'denied';
    }
  });
  return out;
}

function pushDataLayer(command, consent, options) {
  const dataLayer = ensureDataLayer(options);
  if (!dataLayer) {
    return;
  }
  dataLayer.push(buildDataLayerEvent(command, consent, options));
}

// Sent once, before the first consent command that sees them enabled; an option set
// only by a region override therefore still lands before the post-resolution update.
function applyGoogleExtras(options) {
  if (options.adsDataRedaction === true && !sentExtras.adsDataRedaction) {
    sentExtras.adsDataRedaction = true;
    window.gtag('set', 'ads_data_redaction', true);
  }
  if (options.urlPassthrough === true && !sentExtras.urlPassthrough) {
    sentExtras.urlPassthrough = true;
    window.gtag('set', 'url_passthrough', true);
  }
}

function applyWithGtag(command, consent, options) {
  if (!ensureGtag(options)) {
    return false;
  }
  applyGoogleExtras(options);
  window.gtag('consent', command, consent);
  return true;
}

// Microsoft UET Consent Mode only honors ad_storage. Pushing to the uetq array
// before the UET tag loads is Microsoft's documented pattern.
function applyMicrosoftUet(command, consent) {
  window.uetq = window.uetq || [];
  const uetConsent = { ad_storage: consent.ad_storage === 'granted' ? 'granted' : 'denied' };
  // UET requires a default; send one first if UET was only enabled by a region override.
  if (!sentExtras.uetDefault) {
    sentExtras.uetDefault = true;
    window.uetq.push('consent', 'default', uetConsent);
    if (command === 'default') {
      return;
    }
  }
  window.uetq.push('consent', command, uetConsent);
}

let metaAction = '';
let metaPending = false;

// Meta requires fbq('consent', ...) before fbq('init'), but the pixel snippet usually
// loads after Anubis (often via GTM). Trap the snippet's `window.fbq = ...` assignment
// and replay the consent call on the first lookup after its queue exists, which is the
// snippet's own `fbq('init', ...)` call.
function installMetaTrap() {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'fbq');
  if (descriptor && !descriptor.configurable) {
    return;
  }

  let value;
  const restore = (current) => {
    Object.defineProperty(window, 'fbq', {
      configurable: true, enumerable: true, writable: true, value: current,
    });
  };

  Object.defineProperty(window, 'fbq', {
    configurable: true,
    enumerable: true,
    get() {
      if (typeof value === 'function' && (value.queue || value.callMethod)) {
        const current = value;
        restore(current);
        if (metaPending) {
          metaPending = false;
          current('consent', metaAction);
        }
      }
      return value;
    },
    set(next) {
      value = next;
    },
  });
}

function applyMetaPixel(consent) {
  metaAction = consent.ad_storage === 'granted' ? 'grant' : 'revoke';
  if (typeof window.fbq === 'function') {
    window.fbq('consent', metaAction);
    return;
  }
  if (!metaPending) {
    metaPending = true;
    installMetaTrap();
  }
}

function applyIntegrations(command, consent, options) {
  const integrations = options && options.integrations ? options.integrations : {};
  if (integrations.microsoftUet === true) {
    applyMicrosoftUet(command, consent);
  }
  if (integrations.metaPixel === true) {
    applyMetaPixel(consent);
  }
}

function applyConsent(command, googleConsentState, options) {
  const consent = options && options.completeConsentKeys === true
    ? completeConsent(googleConsentState)
    : { ...googleConsentState };
  if (
    command === 'default'
    && options
    && Number.isFinite(options.waitForUpdate)
    && options.waitForUpdate >= 0
  ) {
    consent.wait_for_update = options.waitForUpdate;
  }
  currentOptions = options;
  reconcileDataLayer();
  const hasGtag = applyWithGtag(command, consent, options);
  pushDataLayer(command, consent, options);
  if (command === 'default') {
    defaultRecord = { consent, options };
  } else {
    latestUpdateRecord = { consent, options };
  }
  signaledDataLayer = typeof window !== 'undefined' ? window[getDataLayerName(options)] : null;
  if (typeof window !== 'undefined') {
    applyIntegrations(command, consent, options);
  }
  return hasGtag;
}

export function applyDefaultConsent(googleConsentState, options) {
  return applyConsent('default', googleConsentState, options);
}

export function applyUpdatedConsent(googleConsentState, options) {
  return applyConsent('update', googleConsentState, options);
}
