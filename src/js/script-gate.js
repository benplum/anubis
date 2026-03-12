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

export function createScriptGate(options, isCategoryAllowed) {
  if (typeof document === 'undefined') {
    return { refresh: () => {}, disconnect: () => {} };
  }

  const executed = new Set();

  function shouldAllow(script) {
    const category = getScriptCategory(script);
    if (!category) {
      return options.unknownPolicy === 'allow';
    }
    return isCategoryAllowed(category);
  }

  function blockScript(script) {
    const currentType = script.getAttribute('type') || 'text/javascript';
    const wasBlocked = script.getAttribute('data-blocked') === '1';

    if (currentType === 'text/plain') {
      if (!script.getAttribute('data-type')) {
        script.setAttribute('data-type', 'text/javascript');
      }
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

    const key = scriptFingerprint(script);
    if (executed.has(key)) {
      return;
    }

    const replacement = document.createElement('script');
    copyAttributes(script, replacement);
    replacement.type = script.getAttribute('data-type') || 'text/javascript';
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
    if (!script.hasAttribute('data-consent-category')) {
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
            processScript(node);
          }
          if (node.querySelectorAll) {
            node.querySelectorAll('script[data-consent-category]').forEach(processScript);
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

  scan();

  return {
    refresh: scan,
    disconnect: () => observer.disconnect(),
  };
}
