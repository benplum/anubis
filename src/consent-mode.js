function ensureDataLayer() {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!Array.isArray(window.dataLayer)) {
    window.dataLayer = [];
  }
  return window.dataLayer;
}

function pushDataLayer(command, consent, options) {
  const dataLayer = ensureDataLayer();
  if (!dataLayer) {
    return;
  }
  dataLayer.push({
    event: command === 'default' ? 'anubis_consent_default' : 'anubis_consent_update',
    anubisCommand: command,
    anubisConsent: { ...consent },
    anubisRegion: options.region || '',
    anubisVersion: options.version,
    ...consent,
  });
}

function applyWithGtag(command, consent) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return false;
  }
  window.gtag('consent', command, consent);
  return true;
}

function applyConsent(command, googleConsentState, options) {
  const consent = { ...googleConsentState };
  const hasGtag = applyWithGtag(command, consent);
  pushDataLayer(command, consent, options);
  return hasGtag;
}

export function applyDefaultConsent(googleConsentState, options) {
  return applyConsent('default', googleConsentState, options);
}

export function applyUpdatedConsent(googleConsentState, options) {
  return applyConsent('update', googleConsentState, options);
}
