import { resolveOptions, toGoogleConsent, categoryGranted, DEFAULT_OPTIONS, normalizeCategoriesDefinition } from './config.js';
import { readStoredConsent, saveStoredConsent, clearStoredConsent, clearClientCookies } from './storage.js';
import { applyDefaultConsent, applyUpdatedConsent } from './consent-mode.js';
import { emitConsentEvent, bindConsentTriggers } from './events.js';
import { createScriptGate } from './script-gate.js';
import { renderConsentUI } from './ui.js';

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function statesEqual(a, b) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const key of keys) {
    if ((a && a[key]) !== (b && b[key])) {
      return false;
    }
  }
  return true;
}

function enforceRequiredGranted(state, categories, requiredCategories) {
  const next = { ...state };
  (requiredCategories || []).forEach((categoryName) => {
    (categories[categoryName] || []).forEach((key) => {
      next[key] = 'granted';
    });
  });
  return next;
}

function isRequiredCategory(categoryName, requiredCategories) {
  return Array.isArray(requiredCategories) && requiredCategories.includes(categoryName);
}

function isValidStoredConsent(stored, version) {
  return Boolean(
    stored
    && typeof stored === 'object'
    && Number(stored.version) === Number(version)
    && stored.grants
    && typeof stored.grants === 'object',
  );
}

function buildConsentEventDetail(options, state) {
  return {
    state,
    mode: options.defaultMode,
    locale: options.localeActive,
    region: options.region,
    version: options.version,
  };
}

function applyFastStoredDefault(rawOptions) {
  const input = isObject(rawOptions) ? rawOptions : {};
  const enabled = input.fastDefaults !== false;
  if (!enabled) {
    return { applied: false, googleState: null };
  }

  const storageKey = typeof input.storageKey === 'string' && input.storageKey.trim()
    ? input.storageKey.trim()
    : DEFAULT_OPTIONS.storageKey;
  const version = Number(input.version ?? DEFAULT_OPTIONS.version);

  const stored = readStoredConsent({ storageKey });
  const validStored = isValidStoredConsent(stored, version);

  if (!validStored) {
    return { applied: false, googleState: null };
  }

  const normalizedCategories = normalizeCategoriesDefinition(input.categories || DEFAULT_OPTIONS.categories);
  const categories = normalizedCategories.categoryMap;
  const requiredCategories = normalizedCategories.requiredCategories;
  const internalState = enforceRequiredGranted(stored.grants, categories, requiredCategories);

  const mappingInput = isObject(input.consentMapping) ? input.consentMapping : {};
  const consentMapping = {};
  Object.keys(internalState).forEach((key) => {
    const mapped = mappingInput[key];
    consentMapping[key] = typeof mapped === 'string' && mapped.trim() ? mapped.trim() : key;
  });

  const googleState = toGoogleConsent(internalState, consentMapping);
  applyDefaultConsent(googleState, {
    region: typeof input.region === 'string' ? input.region : '',
    version,
  });

  return { applied: true, googleState };
}

function waitForBody() {
  if (typeof document === 'undefined' || document.body) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) {
        return;
      }
      done = true;
      document.removeEventListener('DOMContentLoaded', finish);
      if (observer) {
        observer.disconnect();
      }
      resolve();
    };

    document.addEventListener('DOMContentLoaded', finish, { once: true });

    let observer = null;
    if (typeof MutationObserver !== 'undefined' && document.documentElement) {
      observer = new MutationObserver(() => {
        if (document.body) {
          finish();
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    setTimeout(finish, 1500);
  });
}

function hasGrantedToDeniedChange(previousState, nextState) {
  return Object.keys(previousState).some((key) => previousState[key] === 'granted' && nextState[key] === 'denied');
}

function createAllState(options, value) {
  const state = {};
  options.consentKeys.forEach((key) => {
    state[key] = value;
  });
  return enforceRequiredGranted(state, options.categories, options.requiredCategories);
}

function applyCategoryChoices(currentState, categoryChoices, options) {
  const next = { ...currentState };

  Object.keys(categoryChoices).forEach((category) => {
    if (isRequiredCategory(category, options.requiredCategories)) {
      return;
    }
    const enabled = Boolean(categoryChoices[category]);
    const keys = options.categories[category] || [];
    keys.forEach((key) => {
      next[key] = enabled ? 'granted' : 'denied';
    });
  });

  return enforceRequiredGranted(next, options.categories, options.requiredCategories);
}

function isCategoryAllowed(state, options, category) {
  if (options.categories[category]) {
    return categoryGranted(category, state, options.categories);
  }
  if (state[category]) {
    return state[category] === 'granted';
  }
  return options.unknownPolicy === 'allow';
}

function isDoNotTrackEnabled() {
  if (typeof navigator === 'undefined' && typeof window === 'undefined') {
    return false;
  }

  const values = [
    typeof navigator !== 'undefined' ? navigator.doNotTrack : null,
    typeof window !== 'undefined' ? window.doNotTrack : null,
    typeof navigator !== 'undefined' ? navigator.msDoNotTrack : null,
  ];

  return values.some((value) => {
    if (value === null || typeof value === 'undefined') {
      return false;
    }
    const normalized = String(value).trim().toLowerCase();
    return normalized === '1' || normalized === 'yes';
  });
}

export async function initAnubis(rawOptions = {}) {
  const fastDefault = applyFastStoredDefault(rawOptions);
  await waitForBody();
  const options = await resolveOptions(rawOptions);
  const stored = readStoredConsent(options);
  const validStored = isValidStoredConsent(stored, options.version);
  let hasStoredConsent = validStored;
  let doNotTrackApplied = false;

  let state = { ...options.defaultConsentInternal };
  if (validStored) {
    state = {
      ...state,
      ...stored.grants,
    };
    state = enforceRequiredGranted(state, options.categories, options.requiredCategories);
  }

  if (!hasStoredConsent && options.respectDoNotTrack && isDoNotTrackEnabled()) {
    state = createAllState(options, 'denied');
    saveStoredConsent(
      {
        version: options.version,
        grants: state,
        updatedAt: Date.now(),
      },
      options,
    );
    hasStoredConsent = true;
    doNotTrackApplied = true;
  }

  if (!fastDefault.applied) {
    applyDefaultConsent(options.defaultConsentGoogle, options);
  }

  if (hasStoredConsent) {
    const storedGoogleState = toGoogleConsent(state, options.consentMapping);
    if (!fastDefault.applied || !statesEqual(fastDefault.googleState, storedGoogleState)) {
      applyUpdatedConsent(storedGoogleState, options);
    }
  }

  const scriptGate = createScriptGate(options, (category) => isCategoryAllowed(state, options, category));
  function handleAction(action, meta = {}) {
    switch (action) {
      case 'open':
        ui.openDialog();
        return;
      case 'close':
        ui.closeDialog();
        return;
      case 'accept':
        acceptAll();
        return;
      case 'reject':
        rejectAll();
        return;
      case 'save': {
        const choices = typeof meta.readCategoryChoices === 'function' ? meta.readCategoryChoices() : ui.readCategoryChoices();
        commitState(applyCategoryChoices(state, choices, options), meta.source === 'dialog' ? 'dialog' : 'trigger-save');
        return;
      }
      default:
        break;
    }

    emitConsentEvent('consent:action', {
      action,
      source: meta.source || 'ui',
      state,
    });
  }

  const ui = renderConsentUI(options, { onAction: handleAction });

  function commitState(nextState, source) {
    const previous = state;
    const revoked = hasGrantedToDeniedChange(previous, nextState);

    state = enforceRequiredGranted(nextState, options.categories, options.requiredCategories);

    saveStoredConsent(
      {
        version: options.version,
        grants: state,
        updatedAt: Date.now(),
      },
      options,
    );

    const googleState = toGoogleConsent(state, options.consentMapping);
    applyUpdatedConsent(googleState, options);

    emitConsentEvent('consent:updated', {
      source,
      googleState,
      ...buildConsentEventDetail(options, state),
    });

    scriptGate.refresh();
    ui.updateFromState(state);
    ui.showBanner(false);

    if (revoked) {
      emitConsentEvent('consent:revoked', { source, state, googleState });
      if (options.reloadOnRevoke) {
        clearClientCookies();
        if (typeof location !== 'undefined' && typeof location.reload === 'function') {
          location.reload();
        }
      }
    }
  }

  function acceptAll() {
    commitState(createAllState(options, 'granted'), 'accept');
  }

  function rejectAll() {
    commitState(createAllState(options, 'denied'), 'reject');
  }

  function reset() {
    clearStoredConsent(options);
    hasStoredConsent = false;
    doNotTrackApplied = false;
    state = { ...options.defaultConsentInternal };

    applyUpdatedConsent(options.defaultConsentGoogle, options);
    scriptGate.refresh();
    ui.updateFromState(state);
    ui.showBanner(true);
    if (ui && typeof ui.showDntBanner === 'function') {
      ui.showDntBanner(false);
    }

    emitConsentEvent('consent:updated', {
      source: 'reset',
      googleState: options.defaultConsentGoogle,
      ...buildConsentEventDetail(options, state),
    });
  }

  const unbindTriggers = bindConsentTriggers((action) => {
    handleAction(action, { source: 'trigger' });
  });

  ui.updateFromState(state);
  ui.showBanner(!hasStoredConsent);
  if (ui && typeof ui.showDntBanner === 'function') {
    ui.showDntBanner(doNotTrackApplied);
  }

  emitConsentEvent('consent:ready', {
    hasStoredConsent: Boolean(hasStoredConsent),
    doNotTrackApplied,
    ...buildConsentEventDetail(options, state),
  });

  return {
    getState: () => ({ ...state }),
    getOptions: () => options,
    open: () => ui.openDialog(),
    refreshStyles: () => {
      if (ui && typeof ui.refreshStyles === 'function') {
        ui.refreshStyles();
      }
    },
    acceptAll,
    rejectAll,
    reset,
    saveChoices: (choices) => commitState(applyCategoryChoices(state, choices || {}, options), 'api'),
    destroy: () => {
      unbindTriggers();
      scriptGate.disconnect();
      if (ui && typeof ui.destroy === 'function') {
        ui.destroy();
      }
    },
  };
}
