function ensureDataLayer() {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!Array.isArray(window.dataLayer)) {
    window.dataLayer = [];
  }
  return window.dataLayer;
}

function ensureGtag() {
  if (typeof window === 'undefined') {
    return false;
  }

  ensureDataLayer();

  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }

  return typeof window.gtag === 'function';
}

function pushDataLayer(command, consent, options) {
  const dataLayer = ensureDataLayer();
  if (!dataLayer) {
    return;
  }
  dataLayer.push({
    event: command === 'default' ? 'consent_default' : 'consent_update',
    consentCommand: command,
    consentState: { ...consent },
    consentRegion: options.region || '',
    consentVersion: options.version,
    ...consent,
  });
}

function applyWithGtag(command, consent) {
  if (!ensureGtag()) {
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
