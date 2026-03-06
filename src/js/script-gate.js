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
    if (currentType === 'text/plain' && script.getAttribute('data-anubis-managed') === '1') {
      return;
    }
    script.setAttribute('data-anubis-managed', '1');
    script.setAttribute('data-anubis-original-type', currentType);
    script.setAttribute('type', 'text/plain');
  }

  function activateScript(script) {
    if (script.getAttribute('type') !== 'text/plain' || script.getAttribute('data-anubis-managed') !== '1') {
      return;
    }

    const key = scriptFingerprint(script);
    if (executed.has(key)) {
      return;
    }

    const replacement = document.createElement('script');
    copyAttributes(script, replacement);
    replacement.type = script.getAttribute('data-anubis-original-type') || 'text/javascript';
    if (script.textContent) {
      replacement.textContent = script.textContent;
    }
    replacement.setAttribute('data-anubis-managed', '1');
    replacement.setAttribute('data-anubis-executed', '1');

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
