import { resolveOptions, resolveOptionsSync, toGoogleConsent, categoryGranted } from './config.js';
import { readStoredConsent, saveStoredConsent, clearStoredConsent, clearClientCookies } from './storage.js';
import { applyDefaultConsent, applyUpdatedConsent, watchDataLayerDuringParse } from './consent-mode.js';
import { emitConsentEvent, bindConsentTriggers } from './events.js';
import { createScriptGate } from './script-gate.js';
import { renderConsentUI } from './ui.js';
import { createStatusTargets } from './status.js';

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
    && String(stored.version) === String(version)
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

function cookieNamePattern(name) {
  const escaped = name.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

// `revokeCookies: 'registry'` clears only registered cookies in categories that lost a
// grant. Otherwise every readable cookie is cleared except Anubis's own storage.
function buildRevokedCookieFilter(options, previousState, nextState) {
  const keep = new Set([options.storageKey, options.regionKey || 'consent-region']);
  if (options.revokeCookies !== 'registry') {
    return (name) => !keep.has(name);
  }

  const revokedCategories = Object.keys(options.categories).filter((category) => (
    options.categories[category].some((key) => previousState[key] === 'granted' && nextState[key] === 'denied')
  ));
  const patterns = options.cookies
    .filter((cookie) => revokedCategories.includes(cookie.category))
    .map((cookie) => cookieNamePattern(cookie.name));

  return (name) => !keep.has(name) && patterns.some((pattern) => pattern.test(name));
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

function detectPrivacySignal() {
  if (typeof navigator === 'undefined' && typeof window === 'undefined') {
    return { enabled: false, type: '' };
  }

  const gpcValues = [
    typeof navigator !== 'undefined' ? navigator.globalPrivacyControl : null,
    typeof window !== 'undefined' ? window.globalPrivacyControl : null,
  ];

  const gpcEnabled = gpcValues.some((value) => value === true);
  if (gpcEnabled) {
    return { enabled: true, type: 'gpc' };
  }

  const values = [
    typeof navigator !== 'undefined' ? navigator.doNotTrack : null,
    typeof window !== 'undefined' ? window.doNotTrack : null,
    typeof navigator !== 'undefined' ? navigator.msDoNotTrack : null,
  ];

  const doNotTrackEnabled = values.some((value) => {
    if (value === null || typeof value === 'undefined') {
      return false;
    }
    const normalized = String(value).trim().toLowerCase();
    return normalized === '1' || normalized === 'yes';
  });

  return {
    enabled: doNotTrackEnabled,
    type: doNotTrackEnabled ? 'dnt' : '',
  };
}

function computeInitialState(options, regionPending) {
  const stored = readStoredConsent(options);
  const hasStoredConsent = isValidStoredConsent(stored, options.version);
  const privacySignal = options.respectPrivacySignal ? detectPrivacySignal() : { enabled: false, type: '' };

  // A choice saved while a signal was active is an explicit opt-in that overrides it.
  // GPC is the stronger signal, so a choice made under GPC also covers DNT, not vice versa.
  const signalAcknowledged = hasStoredConsent && privacySignal.enabled && (
    stored.privacySignal === privacySignal.type || stored.privacySignal === 'gpc'
  );
  const privacySignalApplied = privacySignal.enabled && !signalAcknowledged;
  let showBanner = !hasStoredConsent;

  let state;
  if (hasStoredConsent) {
    state = enforceRequiredGranted({ ...options.defaultConsentInternal, ...stored.grants }, options.categories, options.requiredCategories);
    const deniedState = createAllState(options, 'denied');
    if (privacySignalApplied && !statesEqual(state, deniedState)) {
      // The signal conflicts with an earlier opt-in: honor the signal and let the
      // visitor confirm or change their choice (CCPA regs § 7025(c)(3)).
      state = deniedState;
      showBanner = true;
    }
  } else if (regionPending || privacySignal.enabled) {
    // Until the region is known, stay restrictive; the resolved state is sent as an update.
    state = createAllState(options, 'denied');
  } else {
    state = { ...options.defaultConsentInternal };
  }

  return { state, hasStoredConsent, privacySignal, privacySignalApplied, showBanner };
}

export async function initAnubis(rawOptions = {}, hooks = {}) {
  // Everything up to the first `await` runs synchronously while the script is
  // evaluated, so the consent default lands in dataLayer before the GTM container
  // snippet and the script gate observes parser-inserted scripts that follow.
  const early = resolveOptionsSync(rawOptions);
  let options = early.options;
  let initial = computeInitialState(options, early.regionPending);
  let state = initial.state;
  let hasStoredConsent = initial.hasStoredConsent;
  let privacySignalApplied = initial.privacySignalApplied;
  let privacySignalType = privacySignalApplied ? initial.privacySignal.type : '';

  // Skip wait_for_update when a stored choice is final; tags would otherwise idle for
  // nothing. While the region is pending the resolved rules may still change it.
  const signaledGoogleState = toGoogleConsent(state, options.consentMapping);
  const storedIsFinal = hasStoredConsent && !early.regionPending;
  applyDefaultConsent(signaledGoogleState, storedIsFinal ? { ...options, waitForUpdate: null } : options);
  watchDataLayerDuringParse();

  const scriptGate = createScriptGate(
    (category) => isCategoryAllowed(state, options, category),
    { intercept: options.interceptScripts !== false },
  );

  await waitForBody();

  if (early.regionPending) {
    options = await resolveOptions(rawOptions);
    initial = computeInitialState(options, false);
    state = initial.state;
    hasStoredConsent = initial.hasStoredConsent;
    privacySignalApplied = initial.privacySignalApplied;
    privacySignalType = privacySignalApplied ? initial.privacySignal.type : '';

    // Always update, even when unchanged: it releases tags held by wait_for_update.
    applyUpdatedConsent(toGoogleConsent(state, options.consentMapping), options);
    scriptGate.refresh();
  }

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

  // Sale/sharing opt-out status (CCPA regs §§ 7025(c)(6), 7026(g)). "opted-out" only
  // after a processed signal or a saved choice; a default denial is not an opt-out.
  function getOptOutStatus() {
    const keys = options.saleSharingKeys || [];
    if (!keys.length) {
      return 'none';
    }
    if (keys.every((key) => state[key] === 'denied')) {
      return privacySignalApplied || hasStoredConsent ? 'opted-out' : 'none';
    }
    return hasStoredConsent ? 'opted-in' : 'none';
  }

  function getOptOutStatusText(status) {
    if (status === 'opted-out') {
      return options.strings.statusOptedOut || '';
    }
    if (status === 'opted-in') {
      return options.strings.statusOptedIn || '';
    }
    return '';
  }

  const statusTargets = createStatusTargets(() => {
    const value = getOptOutStatus();
    return { value, text: getOptOutStatusText(value) };
  });

  function refreshStatus() {
    ui.setStatusText(getOptOutStatusText(getOptOutStatus()));
    statusTargets.render();
  }

  function applyDetectedPrivacySignal(detectedSignal, source) {
    if (!detectedSignal || !detectedSignal.enabled || privacySignalApplied) {
      return false;
    }

    const next = computeInitialState(options, false);
    if (!next.privacySignalApplied) {
      return false;
    }

    privacySignalApplied = true;
    privacySignalType = next.privacySignal.type;
    const changed = !statesEqual(state, next.state);
    state = next.state;

    let googleState;
    if (changed) {
      googleState = toGoogleConsent(state, options.consentMapping);
      applyUpdatedConsent(googleState, options);
      scriptGate.refresh();
      ui.updateFromState(state);
    }
    if (next.showBanner) {
      ui.showBanner(true);
    }
    if (ui && typeof ui.setPrivacySignalHonored === 'function') {
      ui.setPrivacySignalHonored(privacySignalApplied);
    }
    refreshStatus();

    if (changed) {
      emitConsentEvent('consent:updated', {
        source,
        googleState,
        ...buildConsentEventDetail(options, state),
        optOutStatus: getOptOutStatus(),
        privacySignalApplied,
        privacySignalType,
      });
    }

    return true;
  }

  function commitState(nextState, source) {
    const previous = state;
    const revoked = hasGrantedToDeniedChange(previous, nextState);

    state = enforceRequiredGranted(nextState, options.categories, options.requiredCategories);
    hasStoredConsent = true;
    privacySignalApplied = false;
    privacySignalType = '';

    saveStoredConsent(
      {
        version: options.version,
        grants: state,
        privacySignal: options.respectPrivacySignal ? detectPrivacySignal().type : '',
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
      optOutStatus: getOptOutStatus(),
    });

    scriptGate.refresh();
    ui.updateFromState(state);
    ui.showBanner(false);
    refreshStatus();

    if (revoked) {
      emitConsentEvent('consent:revoked', { source, state, googleState });
      if (options.reloadOnRevoke) {
        clearClientCookies(buildRevokedCookieFilter(options, previous, state));
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
    const next = computeInitialState(options, false);
    hasStoredConsent = false;
    privacySignalApplied = next.privacySignalApplied;
    privacySignalType = privacySignalApplied ? next.privacySignal.type : '';
    state = next.state;

    const resetGoogleState = toGoogleConsent(state, options.consentMapping);
    applyUpdatedConsent(resetGoogleState, options);
    scriptGate.refresh();
    ui.updateFromState(state);
    ui.showBanner(!hasStoredConsent || privacySignalApplied);
    if (ui && typeof ui.setPrivacySignalHonored === 'function') {
      ui.setPrivacySignalHonored(privacySignalApplied);
    }
    refreshStatus();

    emitConsentEvent('consent:updated', {
      source: 'reset',
      googleState: resetGoogleState,
      ...buildConsentEventDetail(options, state),
      optOutStatus: getOptOutStatus(),
    });
  }

  const unbindTriggers = bindConsentTriggers((action) => {
    handleAction(action, { source: 'trigger' });
  });

  let stopPrivacySignalWatch = () => {};

  function startPrivacySignalWatch() {
    if (!options.respectPrivacySignal || privacySignalApplied) {
      return () => {};
    }

    let stopped = false;
    const timerIds = [];

    const runCheck = (source) => {
      if (stopped || privacySignalApplied) {
        return;
      }
      const signal = detectPrivacySignal();
      applyDetectedPrivacySignal(signal, source);
    };

    // Catch async/plugin-populated GPC values without delaying first paint.
    [1, 10, 50, 150, 300, 600, 1000, 2000].forEach((delayMs) => {
      timerIds.push(setTimeout(() => {
        runCheck(`privacy-signal-watch-${delayMs}ms`);
      }, delayMs));
    });

    const onVisibility = () => runCheck('privacy-signal-watch-visibilitychange');
    const onPageShow = () => runCheck('privacy-signal-watch-pageshow');

    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', onVisibility);
    }
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('pageshow', onPageShow);
    }

    return () => {
      stopped = true;
      timerIds.forEach((timerId) => clearTimeout(timerId));
      if (typeof document !== 'undefined' && document.removeEventListener) {
        document.removeEventListener('visibilitychange', onVisibility);
      }
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('pageshow', onPageShow);
      }
    };
  }

  ui.updateFromState(state);
  ui.showBanner(initial.showBanner);
  if (ui && typeof ui.setPrivacySignalHonored === 'function') {
    ui.setPrivacySignalHonored(privacySignalApplied);
  }
  refreshStatus();

  stopPrivacySignalWatch = startPrivacySignalWatch();

  const api = {
    getState: () => ({ ...state }),
    getOptions: () => options,
    getOptOutStatus,
    open: () => ui.openDialog(),
    refreshStyles: () => {
      if (ui && typeof ui.refreshStyles === 'function') {
        ui.refreshStyles();
      }
    },
    acceptAll,
    rejectAll,
    reset,
    saveChoices: (choices) => {
      commitState(applyCategoryChoices(state, choices || {}, options), 'api');
    },
    destroy: () => {
      stopPrivacySignalWatch();
      unbindTriggers();
      scriptGate.disconnect();
      statusTargets.disconnect();
      if (ui && typeof ui.destroy === 'function') {
        ui.destroy();
      }
    },
  };

  // Expose the API before `consent:ready` so listeners can call it.
  if (typeof hooks.onApi === 'function') {
    hooks.onApi(api);
  }

  emitConsentEvent('consent:ready', {
    hasStoredConsent: Boolean(hasStoredConsent),
    doNotTrackApplied: Boolean(privacySignalApplied),
    privacySignalApplied,
    privacySignalType,
    ...buildConsentEventDetail(options, state),
    optOutStatus: getOptOutStatus(),
  });

  return api;
}
