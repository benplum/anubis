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

const VALID_ACTION_IDS = new Set(['open', 'accept-all', 'reject-all', 'save', 'close']);
const VALID_ACTION_VARIANTS = new Set(['primary', 'secondary', 'link', 'icon']);

const DEFAULT_ACTIONS = {
  banner: [
    { id: 'reject-all', variant: 'secondary', labelKey: 'rejectAll' },
    { id: 'accept-all', variant: 'primary', labelKey: 'acceptAll' },
    { id: 'open', variant: 'link', labelKey: 'manage' },
  ],
  dialog: {
    header: [{ id: 'close', variant: 'icon', labelKey: 'cancel', closeDialog: true }],
    footer: [
      { id: 'reject-all', variant: 'secondary', labelKey: 'rejectAll', closeDialog: true },
      { id: 'accept-all', variant: 'secondary', labelKey: 'acceptAll', closeDialog: true },
      { id: 'save', variant: 'primary', labelKey: 'save', closeDialog: true },
    ],
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
  regionCache: {
    enabled: true,
    storage: 'localStorage',
    key: 'anubis-region-cache',
    ttlSeconds: 86400,
  },
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
  actions: DEFAULT_ACTIONS,
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

function normalizeAction(item, fallback) {
  const input = isObject(item) ? item : {};
  const candidateId = typeof input.id === 'string' ? input.id.trim() : '';
  const id = VALID_ACTION_IDS.has(candidateId) ? candidateId : fallback.id;
  if (!id || !VALID_ACTION_IDS.has(id)) {
    return null;
  }

  const variantCandidate = typeof input.variant === 'string' ? input.variant.trim() : '';
  const fallbackVariant = typeof fallback.variant === 'string' ? fallback.variant : 'secondary';
  const variant = VALID_ACTION_VARIANTS.has(variantCandidate)
    ? variantCandidate
    : VALID_ACTION_VARIANTS.has(fallbackVariant)
      ? fallbackVariant
      : 'secondary';

  const normalized = {
    id,
    variant,
    visible: input.visible !== false,
  };

  if (typeof input.label === 'string' && input.label.trim()) {
    normalized.label = input.label.trim();
  } else if (typeof fallback.label === 'string' && fallback.label.trim()) {
    normalized.label = fallback.label.trim();
  }

  if (typeof input.labelKey === 'string' && input.labelKey.trim()) {
    normalized.labelKey = input.labelKey.trim();
  } else if (typeof fallback.labelKey === 'string' && fallback.labelKey.trim()) {
    normalized.labelKey = fallback.labelKey.trim();
  }

  if (typeof input.closeDialog === 'boolean') {
    normalized.closeDialog = input.closeDialog;
  } else if (typeof fallback.closeDialog === 'boolean') {
    normalized.closeDialog = fallback.closeDialog;
  } else {
    normalized.closeDialog = false;
  }

  return normalized;
}

function normalizeActionList(inputList, fallbackList) {
  const source = Array.isArray(inputList) ? inputList : fallbackList;
  const normalized = source
    .map((item, index) => normalizeAction(item, fallbackList[index] || fallbackList[0] || {}))
    .filter(Boolean)
    .filter((item) => item.visible !== false);

  if (normalized.length) {
    return normalized;
  }

  return fallbackList
    .map((item) => normalizeAction(item, item))
    .filter(Boolean)
    .filter((item) => item.visible !== false);
}

function normalizeActions(actions) {
  const source = isObject(actions) ? actions : {};
  const dialog = isObject(source.dialog) ? source.dialog : {};

  return {
    banner: normalizeActionList(source.banner, DEFAULT_ACTIONS.banner),
    dialog: {
      header: normalizeActionList(dialog.header, DEFAULT_ACTIONS.dialog.header),
      footer: normalizeActionList(dialog.footer, DEFAULT_ACTIONS.dialog.footer),
    },
  };
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

  const cached = readRegionCache(options);
  if (cached) {
    return cached;
  }

  const timeoutMs = Number(options.resolveRegionTimeoutMs) > 0 ? Number(options.resolveRegionTimeoutMs) : 500;
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => resolve(options.region || ''), timeoutMs);
  });

  try {
    const result = await Promise.race([Promise.resolve(options.resolveRegion()), timeoutPromise]);
    if (typeof result === 'string' && result.trim()) {
      const normalized = result.trim();
      writeRegionCache(options, normalized);
      return normalized;
    }
  } catch (error) {
    return options.region || '';
  }

  return options.region || '';
}

function getRegionCacheConfig(options) {
  const incoming = isObject(options.regionCache) ? options.regionCache : {};
  return {
    enabled: incoming.enabled !== false,
    storage: incoming.storage === 'sessionStorage' ? 'sessionStorage' : 'localStorage',
    key: typeof incoming.key === 'string' && incoming.key.trim() ? incoming.key.trim() : 'anubis-region-cache',
    ttlSeconds: Number(incoming.ttlSeconds) > 0 ? Number(incoming.ttlSeconds) : 86400,
  };
}

function getStorageArea(type) {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    if (type === 'sessionStorage' && window.sessionStorage) {
      return window.sessionStorage;
    }
    if (window.localStorage) {
      return window.localStorage;
    }
  } catch (_error) {
    return null;
  }
  return null;
}

function readRegionCache(options) {
  const config = getRegionCacheConfig(options);
  if (!config.enabled) {
    return '';
  }

  const storage = getStorageArea(config.storage);
  if (!storage) {
    return '';
  }

  try {
    const raw = storage.getItem(config.key);
    if (!raw) {
      return '';
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      storage.removeItem(config.key);
      return '';
    }

    const value = typeof parsed.value === 'string' ? parsed.value.trim() : '';
    const expiresAt = Number(parsed.expiresAt);
    if (!value || !Number.isFinite(expiresAt)) {
      storage.removeItem(config.key);
      return '';
    }

    if (Date.now() > expiresAt) {
      storage.removeItem(config.key);
      return '';
    }

    return value;
  } catch (_error) {
    return '';
  }
}

function writeRegionCache(options, value) {
  const config = getRegionCacheConfig(options);
  if (!config.enabled || !value) {
    return;
  }

  const storage = getStorageArea(config.storage);
  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      config.key,
      JSON.stringify({
        value,
        expiresAt: Date.now() + config.ttlSeconds * 1000,
      }),
    );
  } catch (_error) {
  }
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

  options.actions = normalizeActions(options.actions);

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
