// Example: Bridge Anubis consent updates to HubSpot consent categories.
//
// HubSpot API reference:
// https://developers.hubspot.com/docs/api-reference/latest/account/settings/consent-banner/consent-banner-api#third-party-cookie-consent
//
// Usage:
//   const disposeBridge = createAnubisHubSpotConsentBridge();
//   // Later, if needed: disposeBridge();

function createAnubisHubSpotConsentBridge(rawOptions) {
  const options = rawOptions && typeof rawOptions === 'object' ? rawOptions : {};
  const debug = options.debug === true;

  // Map HubSpot fields to Anubis categories by default.
  const categoryMap = {
    analytics: 'analytics',
    advertisement: 'marketing',
    functionality: 'preferences',
    ...(options.categoryMap || {}),
  };

  window._hsp = window._hsp || [];

  let lastPayload = '';

  function getAnubisCategories() {
    if (!window.Anubis || typeof window.Anubis.getOptions !== 'function') {
      return {};
    }
    const anubisOptions = window.Anubis.getOptions() || {};
    return anubisOptions.categories || {};
  }

  function getConsentKeysForCategory(categories, categoryName) {
    const definition = categories && categories[categoryName];

    if (definition && Array.isArray(definition)) {
      return definition;
    }

    if (definition && Array.isArray(definition.consent)) {
      return definition.consent;
    }

    // Fallback: allow direct mapping to an individual consent key.
    return [categoryName];
  }

  function allGranted(state, consentKeys) {
    if (!state || typeof state !== 'object') {
      return false;
    }

    if (!Array.isArray(consentKeys) || consentKeys.length === 0) {
      return false;
    }

    return consentKeys.every((key) => state[key] === 'granted');
  }

  function toHubSpotConsent(state) {
    const categories = getAnubisCategories();

    const analyticsKeys = getConsentKeysForCategory(categories, categoryMap.analytics);
    const advertisementKeys = getConsentKeysForCategory(categories, categoryMap.advertisement);
    const functionalityKeys = getConsentKeysForCategory(categories, categoryMap.functionality);

    return {
      analytics: allGranted(state, analyticsKeys),
      advertisement: allGranted(state, advertisementKeys),
      functionality: allGranted(state, functionalityKeys),
    };
  }

  function pushHubSpotConsent(state, source) {
    const payload = toHubSpotConsent(state);
    const serialized = JSON.stringify(payload);

    // Prevent duplicate writes when state has not changed.
    if (serialized === lastPayload) {
      return;
    }

    lastPayload = serialized;
    window._hsp.push(['setHubSpotConsent', payload]);

    if (debug) {
      console.info('[Anubis -> HubSpot] setHubSpotConsent', { source, payload });
    }
  }

  function readStateFromEvent(event) {
    const detail = event && event.detail ? event.detail : {};
    return detail.state && typeof detail.state === 'object' ? detail.state : null;
  }

  function syncFromEvent(event) {
    const state = readStateFromEvent(event);
    if (!state) {
      return;
    }
    pushHubSpotConsent(state, event.type);
  }

  document.addEventListener('consent:ready', syncFromEvent);
  document.addEventListener('consent:updated', syncFromEvent);

  // If Anubis already booted before the bridge was attached, sync immediately.
  if (window.Anubis && typeof window.Anubis.getState === 'function') {
    pushHubSpotConsent(window.Anubis.getState(), 'bridge-init');
  }

  return function disposeAnubisHubSpotConsentBridge() {
    document.removeEventListener('consent:ready', syncFromEvent);
    document.removeEventListener('consent:updated', syncFromEvent);
  };
}
