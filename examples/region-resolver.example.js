// Example: Anubis options with async region resolver
// This complements examples/anubis-options.example.json

window.ConsentOptions = {
  autoStart: true,
  defaultMode: 'opt-out',
  fastDefaults: true,
  regionTimeout: 1200,
  regionCache: true,
  regionKey: 'consent-region',
  regionDuration: 1,

  categories: {
    necessary: { consent: ['security_storage'], required: true },
    marketing: { consent: ['ad_storage', 'ad_user_data', 'ad_personalization'], required: false },
    analytics: { consent: ['analytics_storage'], required: false },
    preferences: { consent: ['functionality_storage', 'personalization_storage'], required: false },
  },

  i18n: {
    localeActive: 'en',
    localeFallback: 'en',
    locales: {
      en: {
        bannerTitle: 'Your privacy choices',
        bannerDescription: 'Choose how this site uses cookies and similar technologies.',
        buttonAccept: 'Accept all',
        buttonReject: 'Reject all',
        buttonManage: 'Manage choices',
        dialogTitle: 'Manage consent preferences',
        dialogDescription: 'Choose which categories you allow. Necessary is always enabled.',
        buttonSave: 'Save choices',
        buttonCancel: 'Close',
        requiredLabel: 'Always active',
        categories: {
          necessary: { label: 'Necessary', description: 'Required for core site functionality.' },
          marketing: { label: 'Marketing', description: 'Advertising and campaign-related storage.' },
          analytics: { label: 'Analytics', description: 'Measurement and analytics storage.' },
          preferences: { label: 'Preferences', description: 'Remembering settings and personalization.' },
        },
      },
      es: {
        bannerTitle: 'Tus opciones de privacidad',
        bannerDescription: 'Elige cómo este sitio usa cookies y tecnologías similares.',
        buttonAccept: 'Aceptar todo',
        buttonReject: 'Rechazar todo',
        buttonManage: 'Gestionar opciones',
        dialogTitle: 'Gestionar preferencias de consentimiento',
        dialogDescription: 'Elige qué categorías permites. Necesarias siempre está activada.',
        buttonSave: 'Guardar opciones',
        buttonCancel: 'Cerrar',
        requiredLabel: 'Siempre activo',
        categories: {
          necessary: { label: 'Necesarias', description: 'Requeridas para el funcionamiento básico del sitio.' },
          marketing: { label: 'Marketing', description: 'Almacenamiento relacionado con publicidad y campañas.' },
          analytics: { label: 'Analítica', description: 'Almacenamiento para medición y analítica.' },
          preferences: { label: 'Preferencias', description: 'Recordar ajustes y personalización.' },
        },
      },
    },
  },

  regionOverrides: {
    US: { localeActive: 'en', defaultMode: 'opt-out' },
    'US-MD': { localeActive: 'en', defaultMode: 'opt-out' },
    ES: { localeActive: 'es', defaultMode: 'opt-out' },
    BR: {
      localeActive: 'en',
      defaultMode: 'opt-in',
      defaultConsent: {
        analytics_storage: 'denied',
        ad_storage: 'denied',
      },
    },
  },

  regionResolver: async () => {
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
    const countryRaw =
      (typeof data === 'string' && data) ||
      data?.country ||
      data?.countryCode ||
      data?.code ||
      data?.iso2 ||
      '';

    const country = String(countryRaw).trim().toUpperCase();
    if (!country) {
      return '';
    }

    const usStateMap = {
      ALABAMA: 'AL', ALASKA: 'AK', ARIZONA: 'AZ', ARKANSAS: 'AR', CALIFORNIA: 'CA', COLORADO: 'CO',
      CONNECTICUT: 'CT', DELAWARE: 'DE', FLORIDA: 'FL', GEORGIA: 'GA', HAWAII: 'HI', IDAHO: 'ID',
      ILLINOIS: 'IL', INDIANA: 'IN', IOWA: 'IA', KANSAS: 'KS', KENTUCKY: 'KY', LOUISIANA: 'LA',
      MAINE: 'ME', MARYLAND: 'MD', MASSACHUSETTS: 'MA', MICHIGAN: 'MI', MINNESOTA: 'MN', MISSISSIPPI: 'MS',
      MISSOURI: 'MO', MONTANA: 'MT', NEBRASKA: 'NE', NEVADA: 'NV', 'NEW HAMPSHIRE': 'NH',
      'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY', 'NORTH CAROLINA': 'NC',
      'NORTH DAKOTA': 'ND', OHIO: 'OH', OKLAHOMA: 'OK', OREGON: 'OR', PENNSYLVANIA: 'PA',
      'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC', 'SOUTH DAKOTA': 'SD', TENNESSEE: 'TN', TEXAS: 'TX',
      UTAH: 'UT', VERMONT: 'VT', VIRGINIA: 'VA', WASHINGTON: 'WA', 'WEST VIRGINIA': 'WV',
      WISCONSIN: 'WI', WYOMING: 'WY', 'DISTRICT OF COLUMBIA': 'DC', DC: 'DC',
    };

    const regionRaw = data?.region || data?.state || data?.subdivision || '';
    const regionUpper = String(regionRaw).trim().toUpperCase();

    if (country === 'US' && regionUpper) {
      const stateCode = usStateMap[regionUpper] || (regionUpper.length === 2 ? regionUpper : '');
      if (stateCode) {
        return `US-${stateCode}`;
      }
    }

    return country;
  },
};

// Load Anubis after assigning options
// <script src="/dist/js/consent.bundled.js"></script>
