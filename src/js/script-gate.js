import { emitConsentEvent } from './events.js';

function scriptFingerprint(script) {
  const source = script.getAttribute('src') || '';
  const content = script.textContent || '';
  return source ? `src:${source}` : `inline:${content.slice(0, 200)}`;
}

function copyAttributes(fromNode, toNode) {
  Array.from(fromNode.attributes).forEach((attr) => {
    if (attr.name === 'type') {
      return;
    }
    toNode.setAttribute(attr.name, attr.value);
  });
  // Browsers blank the nonce attribute after parsing; only the property keeps it.
  if (fromNode.nonce) {
    toNode.nonce = fromNode.nonce;
  }
}

function getScriptCategory(script) {
  const value = script.getAttribute('data-consent-category');
  return value ? value.trim() : '';
}

function describeScript(script) {
  const src = script.getAttribute('src') || '';
  return {
    category: getScriptCategory(script),
    src,
    inline: !src,
    currentType: script.getAttribute('type') || 'text/javascript',
    declaredType: script.getAttribute('data-type') || '',
  };
}

function getDeclaredExecutableType(script) {
  const declared = script.getAttribute('data-type');
  if (typeof declared !== 'string') {
    return '';
  }
  const normalized = declared.trim();
  return normalized;
}

// `isCategoryAllowed` receives the script's category ('' when missing) and is
// evaluated on every check, so consent state may change after the gate is created.
export function createScriptGate(isCategoryAllowed, gateOptions = {}) {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
    return { refresh: () => {}, disconnect: () => {} };
  }

  const executed = new Set();

  function shouldAllow(script) {
    return isCategoryAllowed(getScriptCategory(script));
  }

  // Scripts already in the DOM when the gate starts have been prepared by the
  // browser; changing their type cannot stop them, and re-activating them later
  // would run them twice. Leave them alone and flag the misconfiguration.
  function markMissed(script, reason) {
    script.setAttribute('data-managed', '1');
    script.setAttribute('data-missed', '1');
    emitConsentEvent('consent:script-missed', {
      reason,
      script: describeScript(script),
    });
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(`[Anubis] Script with data-consent-category could not be blocked (${reason}). Add type="text/plain" data-type="text/javascript".`, script);
    }
  }

  // Script-created elements report `async === true` without the attribute (the
  // "non-blocking" flag); the parser never sets it. Those run on insertion, before
  // the observer sees them.
  function isScriptCreated(script) {
    return script.async === true && !script.hasAttribute('async');
  }

  // Scripts inserted by code start running during insertion, before any observer sees
  // them, so gate them at the DOM insertion methods: a denied script is made inert
  // before it is attached. Only insertions into the live document are inspected; a
  // detached subtree is checked once, when it is attached.
  function gateScriptBeforeInsert(script) {
    if (
      script.isConnected
      || !script.hasAttribute('data-consent-category')
      || script.hasAttribute('data-managed')
      || script.getAttribute('type') === 'text/plain'
    ) {
      return;
    }
    if (shouldAllow(script)) {
      script.setAttribute('data-managed', '1');
      executed.add(scriptFingerprint(script));
      return;
    }
    blockScript(script);
  }

  function gateBeforeInsert(node) {
    if (!node || (node.nodeType !== 1 && node.nodeType !== 11)) {
      return;
    }
    if (node.nodeType === 1 && node.tagName === 'SCRIPT') {
      gateScriptBeforeInsert(node);
      return;
    }
    if (node.firstElementChild) {
      node.querySelectorAll('script[data-consent-category]').forEach(gateScriptBeforeInsert);
    }
  }

  const restorers = [];
  function intercept(proto, method, pickNodes) {
    const original = proto && proto[method];
    if (typeof original !== 'function') {
      return;
    }
    const wrapped = function anubisGatedInsert(...args) {
      if (this && this.isConnected) {
        pickNodes(args).forEach(gateBeforeInsert);
      }
      return original.apply(this, args);
    };
    proto[method] = wrapped;
    restorers.push(() => {
      if (proto[method] === wrapped) {
        proto[method] = original;
      }
    });
  }

  if (gateOptions.intercept !== false && typeof Node !== 'undefined' && typeof Element !== 'undefined') {
    const first = (args) => [args[0]];
    const all = (args) => args;
    intercept(Node.prototype, 'appendChild', first);
    intercept(Node.prototype, 'insertBefore', first);
    intercept(Node.prototype, 'replaceChild', first);
    ['append', 'prepend', 'before', 'after', 'replaceWith', 'replaceChildren'].forEach((method) => {
      intercept(Element.prototype, method, all);
    });
    intercept(Element.prototype, 'insertAdjacentElement', (args) => [args[1]]);
  }

  // Fallback for insertion paths not intercepted above.
  function processAddedScript(script) {
    if (
      script.getAttribute('type') !== 'text/plain'
      && !script.hasAttribute('data-managed')
      && isScriptCreated(script)
    ) {
      markMissed(script, 'inserted-by-script');
      return;
    }
    processScript(script);
  }

  function blockScript(script) {
    const currentType = script.getAttribute('type') || 'text/javascript';
    const wasBlocked = script.getAttribute('data-blocked') === '1';

    if (currentType === 'text/plain') {
      script.setAttribute('data-managed', '1');
      script.setAttribute('data-blocked', '1');
      if (!wasBlocked) {
        emitConsentEvent('consent:script-blocked', {
          reason: 'consent-denied',
          script: describeScript(script),
        });
      }
      return;
    }

    script.setAttribute('data-managed', '1');
    script.setAttribute('data-type', currentType);
    script.setAttribute('type', 'text/plain');
    script.setAttribute('data-blocked', '1');
    if (!wasBlocked) {
      emitConsentEvent('consent:script-blocked', {
        reason: 'consent-denied',
        script: describeScript(script),
      });
    }
  }

  function activateScript(script) {
    if (script.getAttribute('type') !== 'text/plain') {
      return;
    }

    const declaredType = getDeclaredExecutableType(script);
    const hasSrc = Boolean(script.getAttribute('src'));
    const activateType = declaredType || (hasSrc ? 'text/javascript' : '');

    if (!activateType) {
      emitConsentEvent('consent:script-skipped', {
        reason: 'missing-data-type',
        script: describeScript(script),
      });
      return;
    }

    const key = scriptFingerprint(script);
    if (executed.has(key)) {
      return;
    }

    const replacement = document.createElement('script');
    copyAttributes(script, replacement);
    replacement.type = activateType;
    if (script.textContent) {
      replacement.textContent = script.textContent;
    }
    replacement.setAttribute('data-managed', '1');
    replacement.setAttribute('data-executed', '1');
    replacement.removeAttribute('data-blocked');

    emitConsentEvent('consent:script-activated', {
      script: {
        ...describeScript(script),
        activateType: replacement.type,
      },
    });

    script.replaceWith(replacement);
    executed.add(key);
  }

  function processScript(script) {
    if (!(script instanceof HTMLScriptElement)) {
      return;
    }
    if (!script.hasAttribute('data-consent-category') || script.hasAttribute('data-missed')) {
      return;
    }

    if (shouldAllow(script)) {
      activateScript(script);
      return;
    }

    blockScript(script);
  }

  function scan() {
    const scripts = document.querySelectorAll('script[data-consent-category]');
    scripts.forEach(processScript);
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) {
            return;
          }
          if (node.matches && node.matches('script[data-consent-category]')) {
            processAddedScript(node);
          }
          if (node.querySelectorAll) {
            node.querySelectorAll('script[data-consent-category]').forEach(processAddedScript);
          }
        });
      }

      if (mutation.type === 'attributes' && mutation.target instanceof HTMLScriptElement) {
        processScript(mutation.target);
      }
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-consent-category'],
  });

  document.querySelectorAll('script[data-consent-category]').forEach((script) => {
    const type = script.getAttribute('type');
    if (type !== 'text/plain' && !script.hasAttribute('data-managed')) {
      markMissed(script, 'loaded-before-anubis');
    }
  });

  scan();

  return {
    refresh: scan,
    disconnect: () => {
      observer.disconnect();
      restorers.forEach((restore) => restore());
    },
  };
}
