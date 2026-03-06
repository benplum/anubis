import { categoryGranted } from './config.js';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toIdFragment(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

function categoryRowsMarkup(options, ids) {
  const categoryNames = Object.keys(options.categories);
  return categoryNames
    .map((name) => {
      const safeName = toIdFragment(name);
      const rowId = `${ids.prefix}-cat-${safeName}`;
      const titleId = `${rowId}-title`;
      const descriptionId = `${rowId}-description`;
      const text = (options.strings.categories && options.strings.categories[name]) || {};
      const label = escapeHtml(text.label || name);
      const description = escapeHtml(text.description || '');
      const disabled = name === 'necessary' ? 'disabled aria-disabled="true" checked' : '';
      const describedBy = description ? ` aria-describedby="${descriptionId}"` : '';
      return `<details class="anubis-cat" data-anubis-cat="${escapeHtml(name)}" id="${rowId}">
  <summary class="anubis-summary">
    <span class="anubis-summary-handle">
      <span class="anubis-summary-arrow" aria-hidden="true"></span>
      <span class="anubis-summary-title" id="${titleId}">${label}</span>
    </span>
    <label class="anubis-switch" data-anubis-toggle-wrap="${escapeHtml(name)}">
      <input class="anubis-toggle" type="checkbox" data-anubis-cat="${escapeHtml(name)}" aria-labelledby="${titleId}"${describedBy} ${disabled}>
    </label>
  </summary>
  ${description ? `<p class="anubis-desc" id="${descriptionId}">${description}</p>` : ''}
</details>`;
    })
    .join('');
}

function policyLinkMarkup(strings, links) {
  const actions = Array.isArray(links.actions)
    ? links.actions
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        const title = typeof item.title === 'string' ? item.title.trim() : '';
        const url = typeof item.url === 'string' ? item.url.trim() : '';
        if (!title || !url) {
          return '';
        }
        return `<a class="anubis-link" href="${escapeHtml(url)}" rel="noopener noreferrer">${escapeHtml(title)}</a>`;
      })
      .filter(Boolean)
    : [];

  if (actions.length) {
    return `<div class="anubis-links">${actions.join('')}</div>`;
  }

  const href = links.privacyPolicyUrl || links.cookiePolicyUrl;
  if (!href) {
    return '';
  }
  return `<div class="anubis-links"><a class="anubis-link" href="${escapeHtml(href)}" rel="noopener noreferrer">${escapeHtml(strings.policyLabel || 'Learn more')}</a></div>`;
}

function getStringByKey(strings, key, fallback = '') {
  if (!key || typeof key !== 'string') {
    return fallback;
  }
  const value = strings[key];
  return typeof value === 'string' && value ? value : fallback;
}

function resolveActionText(action, strings) {
  if (typeof action.label === 'string' && action.label) {
    return action.label;
  }
  if (typeof action.labelKey === 'string') {
    return getStringByKey(strings, action.labelKey, '');
  }
  return action.id;
}

function actionButtonMarkup(action, strings, useTriggerAttribute) {
  const variant = action.variant || 'secondary';
  const text = resolveActionText(action, strings);
  const isIcon = variant === 'icon';
  const className = isIcon ? 'anubis-btn anubis-btn-icon' : `anubis-btn anubis-btn-${variant}`;
  const triggerAttribute = useTriggerAttribute ? ` data-consent-trigger="${escapeHtml(action.id)}"` : '';

  if (isIcon) {
    return `<button type="button" class="${escapeHtml(className)}" data-anubis-action="${escapeHtml(action.id)}" data-anubis-close-dialog="${action.closeDialog ? '1' : '0'}"${triggerAttribute}><span class="anubis-sr">${escapeHtml(text)}</span></button>`;
  }

  return `<button type="button" class="${escapeHtml(className)}" data-anubis-action="${escapeHtml(action.id)}" data-anubis-close-dialog="${action.closeDialog ? '1' : '0'}"${triggerAttribute}>${escapeHtml(text)}</button>`;
}

function bannerActionsMarkup(options, strings) {
  const actions = (options.actions && options.actions.banner) || [];
  return actions.map((action) => actionButtonMarkup(action, strings, true)).join('');
}

function dialogHeaderActionsMarkup(options, strings) {
  const actions = (options.actions && options.actions.dialog && options.actions.dialog.header) || [];
  return actions.map((action) => actionButtonMarkup(action, strings, false)).join('');
}

function dialogFooterActionsMarkup(options, strings) {
  const actions = (options.actions && options.actions.dialog && options.actions.dialog.footer) || [];
  return actions.map((action) => actionButtonMarkup(action, strings, false)).join('');
}

function classifyAnubisStylesheetLink(node) {
  if (!node || node.tagName !== 'LINK') {
    return null;
  }
  if ((node.getAttribute('rel') || '').toLowerCase() !== 'stylesheet') {
    return null;
  }

  const href = (node.getAttribute('href') || '').trim();
  const hrefLower = href.toLowerCase();

  const isTheme = node.id === 'anubisTheme'
    || node.hasAttribute('data-anubis-theme')
    || hrefLower.includes('theme-light.css')
    || hrefLower.includes('theme-dark.css')
    || hrefLower.includes('theme-');

  if (isTheme) {
    return href ? 'theme' : null;
  }

  const isBase = hrefLower.includes('anubis.css') || hrefLower.includes('/anubis/');
  return isBase ? 'base' : null;
}

function cloneAnubisStylesIntoShadow(shadowRoot) {
  if (!shadowRoot || typeof shadowRoot.appendChild !== 'function') {
    return;
  }

  const seen = new Set();
  const baseNodes = [];
  const themeNodes = [];

  function pushNode(role, node, key) {
    const fingerprint = `${role}:${key}`;
    if (seen.has(fingerprint)) {
      return;
    }
    seen.add(fingerprint);
    if (role === 'theme') {
      themeNodes.push(node);
      return;
    }
    baseNodes.push(node);
  }

  const inlineBase = document.getElementById('anubis-styles');
  if (inlineBase && inlineBase.tagName === 'STYLE') {
    pushNode('base', inlineBase, '#anubis-styles');
  }

  document.querySelectorAll('style[data-anubis-theme]').forEach((node) => {
    const text = node.textContent || '';
    pushNode('theme', node, `inline-theme:${text.length}`);
  });

  document.querySelectorAll('link[rel="stylesheet"]').forEach((node) => {
    const role = classifyAnubisStylesheetLink(node);
    if (!role) {
      return;
    }
    const href = node.getAttribute('href') || '';
    pushNode(role, node, href || node.id || 'link');
  });

  [...baseNodes, ...themeNodes].forEach((node) => {
    const clone = node.cloneNode(true);
    clone.setAttribute('data-anubis-shadow-style', '1');
    shadowRoot.appendChild(clone);
  });
}

function refreshAnubisShadowStyles(shadowRoot) {
  if (!shadowRoot) {
    return;
  }

  shadowRoot.querySelectorAll('[data-anubis-shadow-style="1"]').forEach((node) => {
    node.remove();
  });

  cloneAnubisStylesIntoShadow(shadowRoot);
}

export function renderConsentUI(options, hooks) {
  if (typeof document === 'undefined') {
    return {
      showBanner: () => {},
      openDialog: () => {},
      closeDialog: () => {},
      updateFromState: () => {},
      readCategoryChoices: () => ({}),
      refreshStyles: () => {},
      destroy: () => {},
    };
  }

  const strings = options.strings;
  const host = document.createElement('div');
  host.className = 'anubis-shadow-host';
  const shadowRoot = host.attachShadow({ mode: 'open' });
  refreshAnubisShadowStyles(shadowRoot);

  const container = document.createElement('div');
  container.className = 'anubis-root';
  const idSeed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ids = {
    prefix: `anubis-${idSeed}`,
    bannerTitle: `anubis-banner-title-${idSeed}`,
    bannerDescription: `anubis-banner-description-${idSeed}`,
    dialogTitle: `anubis-title-${idSeed}`,
    dialogDescription: `anubis-desc-${idSeed}`,
  };
  const bannerDescribedBy = strings.bannerDescription ? ` aria-describedby="${ids.bannerDescription}"` : '';
  const dialogDescribedBy = strings.dialogDescription ? ` aria-describedby="${ids.dialogDescription}"` : '';

  container.innerHTML = `<section class="anubis-banner" role="region" aria-labelledby="${ids.bannerTitle}"${bannerDescribedBy}>
  <div class="anubis-content">
    <h2 class="anubis-title" id="${ids.bannerTitle}">${escapeHtml(strings.bannerTitle || 'Privacy choices')}</h2>
    ${strings.bannerDescription ? `<p class="anubis-desc" id="${ids.bannerDescription}">${escapeHtml(strings.bannerDescription)}</p>` : ''}
    ${policyLinkMarkup(strings, options.links || {})}
  </div>
  <div class="anubis-actions">
    ${bannerActionsMarkup(options, strings)}
  </div>
</section>
<dialog class="anubis-dialog" aria-labelledby="${ids.dialogTitle}"${dialogDescribedBy} aria-modal="true">
  <form class="anubis-form" method="dialog">
    <div class="anubis-dialog-header">
      <h2 class="anubis-title" id="${ids.dialogTitle}" tabindex="-1">${escapeHtml(strings.dialogTitle || 'Consent preferences')}</h2>
      <div class="anubis-actions">
        ${dialogHeaderActionsMarkup(options, strings)}
      </div>
    </div>
    ${strings.dialogDescription ? `<p class="anubis-desc" id="${ids.dialogDescription}">${escapeHtml(strings.dialogDescription)}</p>` : ''}
    <div class="anubis-cats">
      ${categoryRowsMarkup(options, ids)}
    </div>
    <div class="anubis-actions">
      ${dialogFooterActionsMarkup(options, strings)}
    </div>
  </form>
</dialog>`;

  shadowRoot.appendChild(container);
  document.body.prepend(host);

  const banner = container.querySelector('.anubis-banner');
  const dialog = container.querySelector('.anubis-dialog');
  const form = container.querySelector('.anubis-form');
  const toggleMap = {};
  Object.keys(options.categories).forEach((name) => {
    toggleMap[name] = container.querySelector(`input[data-anubis-cat="${name}"]`);
  });

  container.querySelectorAll('.anubis-switch, .anubis-toggle').forEach((node) => {
    node.addEventListener('click', (event) => {
      event.stopPropagation();
    });
  });

  let lastFocus = null;

  function openDialog() {
    if (dialog.open) {
      return;
    }
    lastFocus = document.activeElement;
    dialog.showModal();
    const titleNode = dialog.querySelector('.anubis-title');
    if (titleNode && typeof titleNode.focus === 'function') {
      titleNode.focus();
    }
  }

  function closeDialog() {
    if (!dialog.open) {
      return;
    }
    dialog.close();
    if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus();
    }
  }

  function readCategoryChoices() {
    const choices = {};
    Object.keys(toggleMap).forEach((name) => {
      choices[name] = name === 'necessary' ? true : Boolean(toggleMap[name] && toggleMap[name].checked);
    });
    return choices;
  }

  function updateFromState(state) {
    Object.keys(toggleMap).forEach((name) => {
      if (name === 'necessary') {
        toggleMap[name].checked = true;
        return;
      }
      toggleMap[name].checked = categoryGranted(name, state, options.categories);
    });
  }

  function showBanner(visible) {
    banner.hidden = !visible;
  }

  container.addEventListener('click', (event) => {
    const actionButton = event.target && event.target.closest ? event.target.closest('[data-anubis-action]') : null;
    if (!actionButton || !container.contains(actionButton)) {
      return;
    }

    const action = (actionButton.getAttribute('data-anubis-action') || '').trim();
    if (!action) {
      return;
    }

    const closeAfter = actionButton.getAttribute('data-anubis-close-dialog') === '1';
    const source = actionButton.closest('.anubis-dialog') ? 'dialog' : 'banner';

    if (typeof hooks.onAction === 'function') {
      hooks.onAction(action, {
        source,
        closeDialog: closeAfter,
        readCategoryChoices,
      });
    }

    if (closeAfter) {
      closeDialog();
    }
  });

  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
    });
  }

  if (dialog) {
    dialog.addEventListener('close', () => {
      if (lastFocus && typeof lastFocus.focus === 'function') {
        lastFocus.focus();
      }
    });
  }

  return {
    showBanner,
    openDialog,
    closeDialog,
    updateFromState,
    readCategoryChoices,
    refreshStyles: () => {
      refreshAnubisShadowStyles(shadowRoot);
    },
    destroy: () => {
      if (host.parentNode) {
        host.parentNode.removeChild(host);
      }
    },
  };
}
