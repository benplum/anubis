// Example: default opt-in (safe fallback), but opt-out unless EU or California
// Region resolver source:
//   https://privacyauthenticator.com/location
// Example payload:
//   {"country":"US","region":"Maryland","city":"Reisterstown"}

window.AnubisOptions = {
  autoStart: true,
  version: 2,
  storageKey: 'anubis-consent',
  cookieDays: 180,
  defaultConsentMode: 'opt-in',
  fastDefaultFromStorage: true,
  unknownCategoryPolicy: 'block',
  reloadOnRevoke: true,
  resolveRegionTimeoutMs: 1200,
  regionCache: {
    enabled: true,
    storage: 'localStorage',
    key: 'anubis-region-cache',
    ttlSeconds: 86400,
  },

  categories: {
    necessary: ['security_storage'],
    marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
    analytics: ['analytics_storage'],
    preferences: ['functionality_storage', 'personalization_storage'],
  },

  links: {
    privacyPolicyUrl: '/privacy',
    cookiePolicyUrl: '/cookies',
  },

  regionOverrides: {
    NON_EU_CA: {
      defaultConsentMode: 'opt-out',
    },
    EU: {
      defaultConsentMode: 'opt-in',
    },
    'US-CA': {
      defaultConsentMode: 'opt-in',
    },
  },

  resolveRegion: async () => {
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
// <script src="/dist/anubis.js"></script>
