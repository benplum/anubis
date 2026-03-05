import { resolveOptions, toGoogleConsent, categoryGranted, DEFAULT_OPTIONS } from './config.js';
import { readStoredConsent, saveStoredConsent, clearClientCookies } from './storage.js';
import { applyDefaultConsent, applyUpdatedConsent } from './consent-mode.js';
import { emitConsentEvent, bindConsentTriggers } from './events.js';
import { createScriptGate } from './script-gate.js';
import { renderConsentUI } from './ui.js';

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function coerceCategories(categories) {
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
  if (!normalized.necessary || !normalized.necessary.length) {
    normalized.necessary = ['security_storage'];
  }

  return normalized;
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

function applyFastStoredDefault(rawOptions) {
  const input = isObject(rawOptions) ? rawOptions : {};
  const enabled = input.fastDefaultFromStorage !== false;
  if (!enabled) {
    return { applied: false, googleState: null };
  }

  const storageKey = typeof input.storageKey === 'string' && input.storageKey.trim()
    ? input.storageKey.trim()
    : DEFAULT_OPTIONS.storageKey;
  const version = Number(input.version ?? DEFAULT_OPTIONS.version);

  const stored = readStoredConsent({ storageKey });
  const validStored =
    stored &&
    typeof stored === 'object' &&
    Number(stored.version) === version &&
    stored.grants &&
    typeof stored.grants === 'object';

  if (!validStored) {
    return { applied: false, googleState: null };
  }

  const categories = coerceCategories(input.categories || DEFAULT_OPTIONS.categories);
  const internalState = { ...stored.grants };
  categories.necessary.forEach((key) => {
    internalState[key] = 'granted';
  });

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
  options.categories.necessary.forEach((key) => {
    state[key] = 'granted';
  });
  return state;
}

function applyCategoryChoices(currentState, categoryChoices, options) {
  const next = { ...currentState };

  Object.keys(categoryChoices).forEach((category) => {
    if (category === 'necessary') {
      return;
    }
    const enabled = Boolean(categoryChoices[category]);
    const keys = options.categories[category] || [];
    keys.forEach((key) => {
      next[key] = enabled ? 'granted' : 'denied';
    });
  });

  options.categories.necessary.forEach((key) => {
    next[key] = 'granted';
  });

  return next;
}

function isCategoryAllowed(state, options, category) {
  if (options.categories[category]) {
    return categoryGranted(category, state, options.categories);
  }
  if (state[category]) {
    return state[category] === 'granted';
  }
  return options.unknownCategoryPolicy === 'allow';
}

export async function initAnubis(rawOptions = {}) {
  const fastDefault = applyFastStoredDefault(rawOptions);
  await waitForBody();
  const options = await resolveOptions(rawOptions);
  const stored = readStoredConsent(options);
  const validStored =
    stored &&
    typeof stored === 'object' &&
    Number(stored.version) === Number(options.version) &&
    stored.grants &&
    typeof stored.grants === 'object';

  let state = { ...options.defaultConsentInternal };
  if (validStored) {
    state = {
      ...state,
      ...stored.grants,
    };
    options.categories.necessary.forEach((key) => {
      state[key] = 'granted';
    });
  }

  if (!fastDefault.applied) {
    applyDefaultConsent(options.defaultConsentGoogle, options);
  }

  if (validStored) {
    const storedGoogleState = toGoogleConsent(state, options.consentMapping);
    if (!fastDefault.applied || !statesEqual(fastDefault.googleState, storedGoogleState)) {
      applyUpdatedConsent(storedGoogleState, options);
    }
  }

  const scriptGate = createScriptGate(options, (category) => isCategoryAllowed(state, options, category));
  function handleAction(action, meta = {}) {
    if (action === 'open') {
      ui.openDialog();
      return;
    }
    if (action === 'close') {
      ui.closeDialog();
      return;
    }
    if (action === 'accept-all') {
      acceptAll();
      return;
    }
    if (action === 'reject-all') {
      rejectAll();
      return;
    }
    if (action === 'save') {
      const choices = typeof meta.readCategoryChoices === 'function' ? meta.readCategoryChoices() : ui.readCategoryChoices();
      commitState(applyCategoryChoices(state, choices, options), meta.source === 'dialog' ? 'dialog' : 'trigger-save');
      return;
    }

    emitConsentEvent('consent:action', {
      action,
      source: meta.source || 'ui',
      state,
    });
  }

  const ui = renderConsentUI(options, {
    onAction: (action, meta) => {
      handleAction(action, meta);
    },
  });

  function commitState(nextState, source) {
    const previous = state;
    const revoked = hasGrantedToDeniedChange(previous, nextState);

    state = { ...nextState };
    options.categories.necessary.forEach((key) => {
      state[key] = 'granted';
    });

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
    scriptGate.refresh();
    ui.updateFromState(state);
    ui.showBanner(false);

    emitConsentEvent('consent:changed', {
      source,
      state,
      googleState,
      mode: options.defaultConsentMode,
      locale: options.activeLocale,
      region: options.region,
      version: options.version,
    });

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
    commitState(createAllState(options, 'granted'), 'accept-all');
  }

  function rejectAll() {
    commitState(createAllState(options, 'denied'), 'reject-all');
  }

  const unbindTriggers = bindConsentTriggers((action) => {
    handleAction(action, { source: 'trigger' });
  });

  ui.updateFromState(state);
  ui.showBanner(!validStored);

  emitConsentEvent('consent:ready', {
    hasStoredConsent: Boolean(validStored),
    state,
    mode: options.defaultConsentMode,
    locale: options.activeLocale,
    region: options.region,
    version: options.version,
  });

  return {
    getState: () => ({ ...state }),
    getOptions: () => options,
    open: () => ui.openDialog(),
    acceptAll,
    rejectAll,
    saveChoices: (choices) => commitState(applyCategoryChoices(state, choices || {}, options), 'api'),
    destroy: () => {
      unbindTriggers();
      scriptGate.disconnect();
    },
  };
}
