// Example: default opt-in (safe fallback), but opt-out unless EU or California
// Region resolver source:
//   https://privacyauthenticator.com/location
// Example payload:
//   {"country":"US","region":"Maryland","city":"Reisterstown"}

window.AnubisOptions = {
  autoStart: true,
  version: 2,
  storageKey: 'anubis-consent',
  storageDuration: 180,
  defaultMode: 'opt-in',
  fastDefaults: true,
  unknownPolicy: 'block',
  reloadOnRevoke: true,
  regionTimeout: 1200,
  regionCache: true,
  regionKey: 'anubis-region',
  regionDuration: 1,

  categories: {
    necessary: { consent: ['security_storage'], required: true },
    marketing: { consent: ['ad_storage', 'ad_user_data', 'ad_personalization'], required: false },
    analytics: { consent: ['analytics_storage'], required: false },
    preferences: { consent: ['functionality_storage', 'personalization_storage'], required: false },
  },

  links: {
    actions: [
      { title: 'Privacy policy', url: '/privacy' },
      { title: 'Cookie policy', url: '/cookies' },
    ],
  },

  regionOverrides: {
    NON_EU_CA: {
      defaultMode: 'opt-out',
    },
    EU: {
      defaultMode: 'opt-in',
    },
    'US-CA': {
      defaultMode: 'opt-in',
    },
  },

  regionResolver: async () => {
    try {
      const response = await fetch('https://privacyauthenticator.com/location', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'omit',
        cache: 'no-store',
      });

      if (!response.ok) {
        return '';
      }

      const data = await response.json();
      const country = String(data?.country || data?.countryCode || '').trim().toUpperCase();
      const region = String(data?.region || data?.state || '').trim().toUpperCase();

      if (!country) {
        return '';
      }

      if (country === 'US') {
        if (region === 'CA' || region === 'CALIFORNIA') {
          return 'US-CA';
        }
        return 'NON_EU_CA';
      }

      const euCountryCodes = new Set([
        'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
        'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
        'SI', 'ES', 'SE',
      ]);

      if (euCountryCodes.has(country)) {
        return 'EU';
      }

      return 'NON_EU_CA';
    } catch (_error) {
      return '';
    }
  },
};

// Load Anubis after assigning options
// <script src="/dist/js/anubis.js"></script>
