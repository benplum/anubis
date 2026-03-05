// Example: Anubis options with async region resolver
// This complements examples/anubis-options.example.json

window.AnubisOptions = {
  autoStart: true,
  version: 2,
  storageKey: 'anubis-consent',
  cookieDays: 180,
  defaultConsentMode: 'opt-out',
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

  i18n: {
    fallbackLocale: 'en',
    locales: {
      en: {
        bannerTitle: 'Your privacy choices',
        bannerDescription: 'Choose how this site uses cookies and similar technologies.',
        acceptAll: 'Accept all',
        rejectAll: 'Reject all',
        manage: 'Manage choices',
        dialogTitle: 'Manage consent preferences',
        dialogDescription: 'Choose which categories you allow. Necessary is always enabled.',
        save: 'Save choices',
        cancel: 'Close',
        policyLabel: 'Learn more',
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
        acceptAll: 'Aceptar todo',
        rejectAll: 'Rechazar todo',
        manage: 'Gestionar opciones',
        dialogTitle: 'Gestionar preferencias de consentimiento',
        dialogDescription: 'Elige qué categorías permites. Necesarias siempre está activada.',
        save: 'Guardar opciones',
        cancel: 'Cerrar',
        policyLabel: 'Más información',
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
    US: { activeLocale: 'en', defaultConsentMode: 'opt-out' },
    ES: { activeLocale: 'es', defaultConsentMode: 'opt-out' },
    BR: {
      activeLocale: 'en',
      defaultConsentMode: 'opt-in',
      defaultConsentOverrides: {
        analytics_storage: 'denied',
        ad_storage: 'denied',
      },
    },
  },

  resolveRegion: async () => {
    // Endpoint requested:
    // https://privacyauthenticator.com/country
    // Expected output may vary by deployment; this handles common shapes.
    const response = await fetch('https://privacyauthenticator.com/country', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Region lookup failed: ${response.status}`);
    }

    const data = await response.json();
    const raw =
      (typeof data === 'string' && data) ||
      data?.country ||
      data?.countryCode ||
      data?.code ||
      data?.iso2 ||
      '';

    // Anubis expects region keys matching your regionOverrides object (e.g. US, ES, BR)
    return String(raw).trim().toUpperCase();
  },
};

// Load Anubis after assigning options
// <script src="/dist/anubis.iife.js"></script>
