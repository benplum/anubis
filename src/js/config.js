import { readMirroredObject, writeMirroredObject } from './storage.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const REGION_COOKIE_FALLBACK_KEY = 'consent-region';

const EN_STRINGS = {
  bannerTitle: 'Privacy Settings',
  bannerDescription: 'Choose how this site uses cookies and similar technologies.',
  buttonAccept: 'Accept All',
  buttonReject: 'Reject All',
  buttonManage: 'Manage Choices',
  dialogTitle: 'Privacy Settings',
  dialogDescription: 'Choose which categories to allow.',
  requiredLabel: 'Always Active',
  buttonSave: 'Save Choices',
  buttonCancel: 'Cancel',
  categories: {
    necessary: {
      label: 'Necessary',
      description: 'Required for core site functionality.',
    },
    marketing: { 
      label: 'Marketing', 
      description: 'Advertising and campaign-related storage.' 
    },
    analytics: { 
      label: 'Analytics', 
      description: 'Measurement and analytics storage.' 
    },
    preferences: { 
      label: 'Preferences', 
      description: 'Remembering settings and personalization.' 
    },
  },
};

const VALID_ACTION_IDS = new Set(['open', 'accept', 'reject', 'save', 'close']);
const VALID_ACTION_VARIANTS = new Set(['primary', 'link', 'icon']);

const DEFAULT_ACTIONS = {
  banner: [
    { id: 'reject', labelKey: 'buttonReject' },
    { id: 'accept', variant: 'primary', labelKey: 'buttonAccept' },
    { id: 'open', variant: 'link', labelKey: 'buttonManage' },
  ],
  dialog: {
    header: [{ id: 'close', variant: 'icon', labelKey: 'buttonCancel', closeDialog: true }],
    footer: [
      { id: 'reject', labelKey: 'buttonReject', closeDialog: true },
      { id: 'accept', labelKey: 'buttonAccept', closeDialog: true },
      { id: 'save', variant: 'primary', labelKey: 'buttonSave', closeDialog: true },
    ],
  },
};

export const DEFAULT_OPTIONS = {
//   version: '1.0.0',
  version: 1,
  storageKey: 'consent-options',
  storageDuration: 180,
  //
  defaultMode: 'opt-in',
  defaultConsent: {},
  fastDefaults: true,
  unknownPolicy: 'block',
  reloadOnRevoke: true,
  //
  localeActive: '',
  localeFallback: 'en',
  //
  region: '',
  regionOverrides: {},
  regionTimeout: 500,
  regionCache: true,
  regionKey: 'consent-region',
  regionDuration: 1,
  //
  categories: {
    necessary: { consent: ['security_storage'], required: true },
    marketing: { consent: ['ad_storage', 'ad_user_data', 'ad_personalization'], required: false },
    analytics: { consent: ['analytics_storage'], required: false },
    preferences: { consent: ['functionality_storage', 'personalization_storage'], required: false },
  },
  consentMapping: {},
  i18n: {
    locales: {
      en: EN_STRINGS,
    },
  },
  links: [],
  styles: '',
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
  const fallbackVariant = typeof fallback.variant === 'string' ? fallback.variant : '';
  const variant = VALID_ACTION_VARIANTS.has(variantCandidate)
    ? variantCandidate
    : VALID_ACTION_VARIANTS.has(fallbackVariant)
      ? fallbackVariant
      : '';

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

function normalizeLinks(links) {
  if (!Array.isArray(links)) {
    return [];
  }

  return links
    .map((item) => {
      if (!isObject(item)) {
        return null;
      }
      const title = typeof item.title === 'string' ? item.title.trim() : '';
      const url = typeof item.url === 'string' ? item.url.trim() : '';
      if (!title || !url) {
        return null;
      }
      return { title, url };
    })
    .filter(Boolean);
}

function normalizeStyles(stylesInput) {
  return typeof stylesInput === 'string' ? stylesInput.trim() : '';
}

function normalizedConsentKeys(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .filter((key) => typeof key === 'string' && key.trim())
        .map((key) => key.trim()),
    ),
  );
}

export function normalizeCategoriesDefinition(categoriesInput) {
  const FALLBACK_CATEGORIES = {
    necessary: { consent: ['security_storage'], required: true },
  };

  const input = isObject(categoriesInput) ? categoriesInput : FALLBACK_CATEGORIES;
  const categoryMap = {};
  const requiredSet = new Set();

  Object.keys(input).forEach((rawName) => {
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    if (!name) {
      return;
    }

    const definition = input[rawName];
    if (!isObject(definition)) {
      return;
    }

    const keys = normalizedConsentKeys(definition.consent);
    if (!keys.length) {
      return;
    }

    categoryMap[name] = keys;
    if (definition.required === true) {
      requiredSet.add(name);
    }
  });

  if (!Object.keys(categoryMap).length) {
    categoryMap.necessary = ['security_storage'];
    requiredSet.add('necessary');
  }

  const requiredCategories = Array.from(requiredSet).filter((name) => Array.isArray(categoryMap[name]) && categoryMap[name].length);

  return {
    categoryMap,
    requiredCategories,
  };
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
  const modeGranted = options.defaultMode === 'opt-out' ? 'granted' : 'denied';
  const consent = {};

  options.consentKeys.forEach((key) => {
    consent[key] = modeGranted;
  });

  if (isObject(options.defaultConsent)) {
    Object.keys(options.defaultConsent).forEach((key) => {
      const value = options.defaultConsent[key];
      if (value === 'granted' || value === 'denied') {
        consent[key] = value;
      }
    });
  }

  (options.requiredCategories || []).forEach((categoryName) => {
    const keys = options.categories[categoryName] || [];
    keys.forEach((key) => {
      consent[key] = 'granted';
    });
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
    return { localeActive: 'en', strings: EN_STRINGS };
  }

  const explicit = options.localeActive || options.i18n.localeActive;
  if (explicit && locales[explicit]) {
    return {
      localeActive: explicit,
      strings: mergeDeep(EN_STRINGS, locales[explicit]),
    };
  }

  const nav = typeof navigator !== 'undefined' && navigator.language ? navigator.language.toLowerCase() : '';
  const navBase = nav.split('-')[0];
  const navMatch = available.find((name) => name.toLowerCase() === nav || name.toLowerCase() === navBase);
  if (navMatch) {
    return {
      localeActive: navMatch,
      strings: mergeDeep(EN_STRINGS, locales[navMatch]),
    };
  }

  const fallback = options.localeFallback || options.i18n.localeFallback || 'en';
  const resolvedLocale = locales[fallback] ? fallback : available[0];
  return {
    localeActive: resolvedLocale,
    strings: mergeDeep(EN_STRINGS, locales[resolvedLocale]),
  };
}

function normalizeRegionCode(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().replace(/_/g, '-').toUpperCase();
}

function getRegionOverrideKeys(region) {
  const normalized = normalizeRegionCode(region);
  if (!normalized) {
    return [];
  }

  const parts = normalized.split('-').filter(Boolean);
  const keys = [];
  for (let i = 1; i <= parts.length; i += 1) {
    keys.push(parts.slice(0, i).join('-'));
  }
  return keys;
}

async function resolveConfiguredRegion(options) {
  const fallbackRegion = normalizeRegionCode(options.region);

  if (typeof options.regionResolver !== 'function') {
    return fallbackRegion;
  }

  const cached = readRegionCache(options);
  if (cached) {
    return normalizeRegionCode(cached);
  }

  const timeoutMs = Number(options.regionTimeout) > 0 ? Number(options.regionTimeout) : 500;
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => resolve(fallbackRegion), timeoutMs);
  });

  try {
    const result = await Promise.race([Promise.resolve(options.regionResolver()), timeoutPromise]);
    const normalized = normalizeRegionCode(result);
    if (normalized) {
      writeRegionCache(options, normalized);
      return normalized;
    }
  } catch (error) {
    return fallbackRegion;
  }

  return fallbackRegion;
}

function getRegionCacheConfig(options) {
  const regionKeyInput = typeof options.regionKey === 'string' ? options.regionKey.trim() : '';
  const regionDurationInput = Number(options.regionDuration);
  return {
    enabled: options.regionCache !== false,
    key: regionKeyInput || REGION_COOKIE_FALLBACK_KEY,
    durationDays: Number.isFinite(regionDurationInput) && regionDurationInput > 0 ? regionDurationInput : 1,
  };
}

function readRegionCache(options) {
  const config = getRegionCacheConfig(options);
  if (!config.enabled) {
    return '';
  }

  const entry = readMirroredObject(config.key, (parsed) => {
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, expired: false };
    }
    const value = typeof parsed.value === 'string' ? parsed.value.trim() : '';
    const expiresAt = Number(parsed.expiresAt);
    if (!value) {
      return { valid: false, expired: false };
    }
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
      return { valid: false, expired: true };
    }
    return { valid: true, expired: false };
  });

  if (!entry || typeof entry !== 'object') {
    return '';
  }

  return typeof entry.value === 'string' ? entry.value.trim() : '';
}

function writeRegionCache(options, value) {
  const config = getRegionCacheConfig(options);
  if (!config.enabled || !value) {
    return;
  }

  const updatedAt = Date.now();
  const expiresAt = updatedAt + (config.durationDays * DAY_MS);
  const payload = {
    value,
    updatedAt,
    expiresAt,
  };
  const maxAgeSeconds = Math.max(1, Math.floor((config.durationDays * DAY_MS) / 1000));

  writeMirroredObject(config.key, payload, maxAgeSeconds);
}

function freezeShallow(object) {
  return Object.freeze({ ...object });
}

export async function resolveOptions(rawOptions = {}) {
  const inputOptions = isObject(rawOptions) ? rawOptions : {};
  let options = mergeDeep(DEFAULT_OPTIONS, inputOptions);

  if (Object.prototype.hasOwnProperty.call(inputOptions, 'categories')) {
    options.categories = isObject(inputOptions.categories) ? { ...inputOptions.categories } : {};
  }

  const region = await resolveConfiguredRegion(options);
  const regionOverrides = isObject(options.regionOverrides) ? options.regionOverrides : {};
  const regionOverrideKeys = getRegionOverrideKeys(region);
  regionOverrideKeys.forEach((overrideKey) => {
    if (isObject(regionOverrides[overrideKey])) {
      options = mergeDeep(options, regionOverrides[overrideKey]);
    }
  });

  if (!region && isObject(regionOverrides.default)) {
    options = mergeDeep(options, regionOverrides.default);
  }

  const normalizedCategories = normalizeCategoriesDefinition(options.categories);
  options.categories = normalizedCategories.categoryMap;
  options.requiredCategories = normalizedCategories.requiredCategories;
  options.links = normalizeLinks(options.links);
  options.styles = normalizeStyles(options.styles);

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
    localeActive: locale.localeActive,
    cookieMaxAgeSeconds: Math.max(1, Math.floor((Number(options.storageDuration) || 180) * DAY_MS / 1000)),
  });
}

export function categoryGranted(categoryName, state, categories) {
  const keys = categories[categoryName];
  if (!Array.isArray(keys) || !keys.length) {
    return false;
  }
  return keys.every((key) => state[key] === 'granted');
}
