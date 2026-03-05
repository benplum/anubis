// Example: US state-level region overrides (e.g., CCPA/CPRA for California)

window.AnubisOptions = {
  version: 2,
  defaultConsentMode: 'opt-out',

  regionOverrides: {
    // Country baseline
    US: {
      activeLocale: 'en',
      defaultConsentMode: 'opt-out',
    },

    // State-specific override (applied after US baseline)
    'US-CA': {
      links: {
        privacyPolicyUrl: '/privacy/california',
        cookiePolicyUrl: '/cookies/california',
      },
      actions: {
        banner: [
          { id: 'reject-all', variant: 'secondary', label: 'Reject all' },
          { id: 'accept-all', variant: 'primary', label: 'Accept all' },
          { id: 'open', variant: 'link', label: 'Your Privacy Choices' },
        ],
      },
    },

    // Optional: fallback when no region can be resolved
    default: {
      defaultConsentMode: 'opt-out',
    },
  },

  resolveRegion: async () => {
    const response = await fetch('https://privacyauthenticator.com/location', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Region lookup failed: ${response.status}`);
    }

    const data = await response.json();
    const country = String(data?.country || '').trim().toUpperCase();
    const region = String(data?.region || '').trim().toUpperCase();

    const stateMap = {
      CALIFORNIA: 'CA',
      COLORADO: 'CO',
      CONNECTICUT: 'CT',
      DELAWARE: 'DE',
      IOWA: 'IA',
      MONTANA: 'MT',
      NEBRASKA: 'NE',
      'NEW HAMPSHIRE': 'NH',
      'NEW JERSEY': 'NJ',
      'NEW MEXICO': 'NM',
      OREGON: 'OR',
      TENNESSEE: 'TN',
      TEXAS: 'TX',
      UTAH: 'UT',
      VIRGINIA: 'VA',
      MARYLAND: 'MD',
    };

    if (!country) {
      return '';
    }

    // Handle two-letter states directly (e.g. "CA")
    if (country === 'US' && region.length === 2) {
      return `US-${region}`;
    }

    // Handle full state names from endpoint response (e.g. "Maryland")
    if (country === 'US' && region) {
      const code = stateMap[region] || '';
      if (code) {
        return `US-${code}`;
      }
    }

    return country;
  },
};

// Load Anubis after assigning options
// <script src="/dist/anubis.js"></script>
