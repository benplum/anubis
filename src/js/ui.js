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

function isRequiredCategory(options, name) {
  return Array.isArray(options.requiredCategories) && options.requiredCategories.includes(name);
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
      const required = isRequiredCategory(options, name);
      const disabled = required ? 'disabled aria-disabled="true" checked' : '';
      const alwaysActiveText = required
        ? escapeHtml(getStringByKey(options.strings, 'requiredLabel', 'Always Active'))
        : '';
      const describedBy = description ? ` aria-describedby="${descriptionId}"` : '';
      return `<details class="cat" data-cat="${escapeHtml(name)}" id="${rowId}">
  <summary class="summary">
    <span class="summary-handle">
      <span class="summary-arrow" aria-hidden="true"></span>
      <span class="summary-title" id="${titleId}">${label}</span>
    </span>
    <label class="switch" data-wrap="${escapeHtml(name)}">
      ${alwaysActiveText ? `<span class="switch-note">${alwaysActiveText}</span>` : ''}
      <input class="toggle" type="checkbox" data-cat="${escapeHtml(name)}" aria-labelledby="${titleId}"${describedBy} ${disabled}>
    </label>
  </summary>
  ${description ? `<p class="desc" id="${descriptionId}">${description}</p>` : ''}
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
        return `<a class="link" href="${escapeHtml(url)}" rel="noopener noreferrer">${escapeHtml(title)}</a>`;
      })
      .filter(Boolean)
    : [];

  if (actions.length) {
    return `<div class="links">${actions.join('')}</div>`;
  }

  return '';
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
  const variant = action.variant || '';
  const text = resolveActionText(action, strings);
  const isIcon = variant === 'icon';
  const className = isIcon
    ? 'btn btn-icon'
    : (variant === 'primary' || variant === 'link')
      ? `btn btn-${variant}`
      : 'btn';
  const triggerAttribute = useTriggerAttribute ? ` data-consent="${escapeHtml(action.id)}"` : '';

  if (isIcon) {
    return `<button type="button" class="${escapeHtml(className)}" data-action="${escapeHtml(action.id)}" data-close="${action.closeDialog ? '1' : '0'}"${triggerAttribute}><span class="sr">${escapeHtml(text)}</span></button>`;
  }

  return `<button type="button" class="${escapeHtml(className)}" data-action="${escapeHtml(action.id)}" data-close="${action.closeDialog ? '1' : '0'}"${triggerAttribute}>${escapeHtml(text)}</button>`;
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

function classifyStylesheetLink(node) {
  if (!node || node.tagName !== 'LINK') {
    return null;
  }
  if ((node.getAttribute('rel') || '').toLowerCase() !== 'stylesheet') {
    return null;
  }

  if (node.hasAttribute('data-anubis-theme')) {
    return 'theme';
  }

  const href = (node.getAttribute('href') || '').trim();
  if (!href) {
    return null;
  }

  const hrefLower = href.toLowerCase();
  const hrefWithoutHash = hrefLower.split('#')[0];
  const hrefWithoutQuery = hrefWithoutHash.split('?')[0];
  const fileName = hrefWithoutQuery.split('/').pop() || '';

  if (node.id === 'anubisTheme' || fileName === 'theme-light.css' || fileName === 'theme-dark.css') {
    return 'theme';
  }

  return fileName === 'anubis.css' ? 'base' : null;
}

function cloneStylesIntoShadow(shadowRoot) {
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
    const role = classifyStylesheetLink(node);
    if (!role) {
      return;
    }
    const href = node.getAttribute('href') || '';
    pushNode(role, node, href || node.id || 'link');
  });

  [...baseNodes, ...themeNodes].forEach((node) => {
    const clone = node.cloneNode(true);
    clone.setAttribute('data-shadow', '1');
    shadowRoot.appendChild(clone);
  });
}

function refreshShadowStyles(shadowRoot) {
  if (!shadowRoot) {
    return;
  }

  shadowRoot.querySelectorAll('[data-shadow="1"]').forEach((node) => {
    node.remove();
  });

  cloneStylesIntoShadow(shadowRoot);
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
  host.className = 'shadow-host';
  const shadowRoot = host.attachShadow({ mode: 'open' });
  refreshShadowStyles(shadowRoot);

  const container = document.createElement('div');
  container.className = 'root';
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

  container.innerHTML = `<section class="banner" role="region" aria-labelledby="${ids.bannerTitle}"${bannerDescribedBy}>
  <div class="content">
    <h2 class="title" id="${ids.bannerTitle}">${escapeHtml(strings.bannerTitle || 'Privacy choices')}</h2>
    ${strings.bannerDescription ? `<p class="desc" id="${ids.bannerDescription}">${escapeHtml(strings.bannerDescription)}</p>` : ''}
    ${policyLinkMarkup(strings, options.links || {})}
  </div>
  <div class="actions">
    ${bannerActionsMarkup(options, strings)}
  </div>
</section>
<dialog class="dialog" aria-labelledby="${ids.dialogTitle}"${dialogDescribedBy} aria-modal="true">
  <form class="form" method="dialog">
    <div class="dialog-header">
      <h2 class="title" id="${ids.dialogTitle}" tabindex="-1">${escapeHtml(strings.dialogTitle || 'Consent preferences')}</h2>
      <div class="actions">
        ${dialogHeaderActionsMarkup(options, strings)}
      </div>
    </div>
    ${strings.dialogDescription ? `<p class="desc" id="${ids.dialogDescription}">${escapeHtml(strings.dialogDescription)}</p>` : ''}
    <div class="cats">
      ${categoryRowsMarkup(options, ids)}
    </div>
    <div class="actions">
      ${dialogFooterActionsMarkup(options, strings)}
    </div>
  </form>
</dialog>`;

  shadowRoot.appendChild(container);
  document.body.prepend(host);

  const banner = container.querySelector('.banner');
  const dialog = container.querySelector('.dialog');
  const form = container.querySelector('.form');
  const toggleMap = {};
  Object.keys(options.categories).forEach((name) => {
    toggleMap[name] = container.querySelector(`input[data-cat="${name}"]`);
  });

  container.querySelectorAll('.switch, .toggle').forEach((node) => {
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
    const titleNode = dialog.querySelector('.title');
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
      choices[name] = isRequiredCategory(options, name) ? true : Boolean(toggleMap[name] && toggleMap[name].checked);
    });
    return choices;
  }

  function updateFromState(state) {
    Object.keys(toggleMap).forEach((name) => {
      if (isRequiredCategory(options, name)) {
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
    const actionButton = event.target && event.target.closest ? event.target.closest('[data-action]') : null;
    if (!actionButton || !container.contains(actionButton)) {
      return;
    }

    const action = (actionButton.getAttribute('data-action') || '').trim();
    if (!action) {
      return;
    }

    const closeAfter = actionButton.getAttribute('data-close') === '1';
    const source = actionButton.closest('.dialog') ? 'dialog' : 'banner';

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
      refreshShadowStyles(shadowRoot);
    },
    destroy: () => {
      if (host.parentNode) {
        host.parentNode.removeChild(host);
      }
    },
  };
}
