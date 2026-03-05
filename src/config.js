const DAY_MS = 24 * 60 * 60 * 1000;

const EN_STRINGS = {
  bannerTitle: 'Your privacy choices',
  bannerDescription: 'Choose how this site uses cookies and similar technologies.',
  acceptAll: 'Accept all',
  rejectAll: 'Reject all',
  manage: 'Manage choices',
  dialogTitle: 'Manage consent preferences',
  dialogDescription: 'Choose which categories you allow. Necessary is always enabled.',
  save: 'Save choices',
  cancel: 'Cancel',
  policyLabel: 'Learn more',
  categories: {
    necessary: { label: 'Necessary', description: 'Required for core site functionality.' },
    marketing: { label: 'Marketing', description: 'Advertising and campaign-related storage.' },
    analytics: { label: 'Analytics', description: 'Measurement and analytics storage.' },
    preferences: { label: 'Preferences', description: 'Remembering settings and personalization.' },
  },
};

export const DEFAULT_OPTIONS = {
  version: '1.0.0',
  consentVersion: 1,
  storageKey: 'anubis-consent',
  cookieDays: 180,
  defaultConsentMode: 'opt-out',
  defaultConsentOverrides: {},
  unknownCategoryPolicy: 'block',
  reloadOnRevoke: true,
  resolveRegionTimeoutMs: 500,
  activeLocale: '',
  fallbackLocale: 'en',
  region: '',
  regionOverrides: {},
  categories: {
    necessary: ['security_storage'],
    marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
    analytics: ['analytics_storage'],
    preferences: ['functionality_storage', 'personalization_storage'],
  },
  consentMapping: {},
  i18n: {
    locales: {
      en: EN_STRINGS,
    },
  },
  links: {
    privacyPolicyUrl: '',
    cookiePolicyUrl: '',
  },
};

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeDeep(target, source) {
  const out = { ...target };
  Object.keys(source || {}).forEach((key) => {
    const sourceValue = source[key];
    const targetValue = out[key];
    if (Array.isArray(sourceValue)) {
      out[key] = sourceValue.slice();
      return;
    }
    if (isObject(sourceValue) && isObject(targetValue)) {
      out[key] = mergeDeep(targetValue, sourceValue);
      return;
    }
    out[key] = sourceValue;
  });
  return out;
}

function coerceCategoryMap(categories) {
  const input = isObject(categories) ? categories : {};
  const normalized = {};

  Object.keys(input).forEach((name) => {
    if (!Array.isArray(input[name])) {
      return;
    }
    const keys = input[name].filter((key) => typeof key === 'string' && key.trim()).map((key) => key.trim());
    if (keys.length) {
      normalized[name.trim()] = Array.from(new Set(keys));
    }
  });

  if (!normalized.necessary && normalized.nessecary) {
    normalized.necessary = normalized.nessecary.slice();
  }

  if (!normalized.necessary || normalized.necessary.length === 0) {
    normalized.necessary = ['security_storage'];
  }

  return normalized;
}

function uniqueConsentKeys(categories) {
  const keys = new Set();
  Object.values(categories).forEach((list) => {
    list.forEach((key) => keys.add(key));
  });
  return Array.from(keys);
}

function buildConsentMapping(consentKeys, mappingInput) {
  const mapping = {};
  consentKeys.forEach((key) => {
    const mapped = isObject(mappingInput) ? mappingInput[key] : null;
    mapping[key] = typeof mapped === 'string' && mapped.trim() ? mapped.trim() : key;
  });
  return mapping;
}

function buildDefaultInternalConsent(options) {
  const modeGranted = options.defaultConsentMode === 'opt-in' ? 'granted' : 'denied';
  const consent = {};

  options.consentKeys.forEach((key) => {
    consent[key] = modeGranted;
  });

  if (isObject(options.defaultConsentOverrides)) {
    Object.keys(options.defaultConsentOverrides).forEach((key) => {
      const value = options.defaultConsentOverrides[key];
      if (value === 'granted' || value === 'denied') {
        consent[key] = value;
      }
    });
  }

  options.categories.necessary.forEach((key) => {
    consent[key] = 'granted';
  });

  return consent;
}

export function toGoogleConsent(internalConsent, consentMapping) {
  const googleConsent = {};
  Object.keys(internalConsent).forEach((internalKey) => {
    const targetKey = consentMapping[internalKey] || internalKey;
    const incoming = internalConsent[internalKey] === 'granted' ? 'granted' : 'denied';
    const previous = googleConsent[targetKey];

    if (!previous) {
      googleConsent[targetKey] = incoming;
      return;
    }

    googleConsent[targetKey] = previous === 'denied' || incoming === 'denied' ? 'denied' : 'granted';
  });
  return googleConsent;
}

function pickLocale(options) {
  const locales = options.i18n && isObject(options.i18n.locales) ? options.i18n.locales : {};
  const available = Object.keys(locales);
  if (!available.length) {
    return { activeLocale: 'en', strings: EN_STRINGS };
  }

  const explicit = options.activeLocale || options.i18n.activeLocale;
  if (explicit && locales[explicit]) {
    return {
      activeLocale: explicit,
      strings: mergeDeep(EN_STRINGS, locales[explicit]),
    };
  }

  const nav = typeof navigator !== 'undefined' && navigator.language ? navigator.language.toLowerCase() : '';
  const navBase = nav.split('-')[0];
  const navMatch = available.find((name) => name.toLowerCase() === nav || name.toLowerCase() === navBase);
  if (navMatch) {
    return {
      activeLocale: navMatch,
      strings: mergeDeep(EN_STRINGS, locales[navMatch]),
    };
  }

  const fallback = options.fallbackLocale || options.i18n.fallbackLocale || 'en';
  const fallbackLocale = locales[fallback] ? fallback : available[0];
  return {
    activeLocale: fallbackLocale,
    strings: mergeDeep(EN_STRINGS, locales[fallbackLocale]),
  };
}

async function resolveRegion(options) {
  if (typeof options.resolveRegion !== 'function') {
    return options.region || '';
  }

  const timeoutMs = Number(options.resolveRegionTimeoutMs) > 0 ? Number(options.resolveRegionTimeoutMs) : 500;
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => resolve(options.region || ''), timeoutMs);
  });

  try {
    const result = await Promise.race([Promise.resolve(options.resolveRegion()), timeoutPromise]);
    if (typeof result === 'string' && result.trim()) {
      return result.trim();
    }
  } catch (error) {
    return options.region || '';
  }

  return options.region || '';
}

function freezeShallow(object) {
  return Object.freeze({ ...object });
}

export async function resolveOptions(rawOptions = {}) {
  let options = mergeDeep(DEFAULT_OPTIONS, isObject(rawOptions) ? rawOptions : {});

  options.categories = coerceCategoryMap(options.categories);
  const region = await resolveRegion(options);
  const regionOverrides = isObject(options.regionOverrides) ? options.regionOverrides : {};
  if (region && isObject(regionOverrides[region])) {
    options = mergeDeep(options, regionOverrides[region]);
    options.categories = coerceCategoryMap(options.categories);
  }

  const consentKeys = uniqueConsentKeys(options.categories);
  const consentMapping = buildConsentMapping(consentKeys, options.consentMapping);
  const defaultConsentInternal = buildDefaultInternalConsent({ ...options, consentKeys });
  const defaultConsentGoogle = toGoogleConsent(defaultConsentInternal, consentMapping);
  const locale = pickLocale(options);

  return freezeShallow({
    ...options,
    region,
    consentKeys,
    consentMapping,
    defaultConsentInternal,
    defaultConsentGoogle,
    strings: locale.strings,
    activeLocale: locale.activeLocale,
    cookieMaxAgeSeconds: Math.max(1, Math.floor((Number(options.cookieDays) || 180) * DAY_MS / 1000)),
  });
}

export function categoryGranted(categoryName, state, categories) {
  const keys = categories[categoryName];
  if (!Array.isArray(keys) || !keys.length) {
    return false;
  }
  return keys.every((key) => state[key] === 'granted');
}
