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

function htmlString(value) {
  return typeof value === 'string' ? value : '';
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
      const label = htmlString(text.label || name);
      const description = htmlString(text.description || '');
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
  const actions = Array.isArray(links)
    ? links
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

function appendShadowStylesheet(shadowRoot, href, role) {
  if (!href) {
    return;
  }

  const node = document.createElement('link');
  node.rel = 'stylesheet';
  node.href = href;
  node.setAttribute('data-shadow', '1');
  node.setAttribute('data-shadow-role', role);
  shadowRoot.appendChild(node);
}

function appendShadowInlineStyle(shadowRoot, cssText, role) {
  if (!cssText) {
    return;
  }

  const node = document.createElement('style');
  node.textContent = cssText;
  node.setAttribute('data-shadow', '1');
  node.setAttribute('data-shadow-role', role);
  shadowRoot.appendChild(node);
}

function getStyleSourceById(id) {
  if (typeof document === 'undefined' || !id) {
    return { cssText: '', href: '' };
  }

  const element = document.getElementById(id);
  if (!element) {
    return { cssText: '', href: '' };
  }

  const tagName = element.tagName;
  if (tagName === 'STYLE') {
    return { cssText: element.textContent || '', href: '' };
  }

  if (tagName === 'LINK') {
    const href = (element.getAttribute('href') || '').trim();
    return { cssText: '', href };
  }

  let cssText = '';
  let href = '';

  if (tagName === 'TEMPLATE' && element.content) {
    const styleNodes = element.content.querySelectorAll('style');
    cssText = Array.from(styleNodes)
      .map((node) => node.textContent || '')
      .join('\n')
      .trim();

    const linkNode = element.content.querySelector('link[rel="stylesheet"][href]');
    href = linkNode ? (linkNode.getAttribute('href') || '').trim() : '';
  }

  if (!cssText && !href) {
    cssText = (element.textContent || '').trim();
  }

  return { cssText, href };
}

function refreshShadowStyles(shadowRoot, styles) {
  if (!shadowRoot) {
    return;
  }

  shadowRoot.querySelectorAll('[data-shadow="1"]').forEach((node) => {
    node.remove();
  });

  const baseTemplateSource = getStyleSourceById('consent-styles');
  appendShadowInlineStyle(shadowRoot, baseTemplateSource.cssText, 'base-inline');

  const themeTemplateSource = getStyleSourceById('consent-theme');
  appendShadowInlineStyle(shadowRoot, themeTemplateSource.cssText, 'theme-inline');

  const themeHref = typeof styles === 'string' ? styles.trim() : '';
  const resolvedThemeHref = themeHref || themeTemplateSource.href;
  if (resolvedThemeHref) {
    appendShadowStylesheet(shadowRoot, resolvedThemeHref, 'theme');
  }
}

function waitForThemeStyles(shadowRoot, timeoutMs = 400) {
  if (!shadowRoot) {
    return Promise.resolve();
  }

  const themeNode = shadowRoot.querySelector('[data-shadow-role="theme"]');
  if (!themeNode || themeNode.tagName !== 'LINK') {
    return Promise.resolve();
  }

  if (themeNode.sheet) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) {
        return;
      }
      done = true;
      themeNode.removeEventListener('load', finish);
      themeNode.removeEventListener('error', finish);
      clearTimeout(timerId);
      resolve();
    };

    const timerId = setTimeout(finish, timeoutMs);
    themeNode.addEventListener('load', finish, { once: true });
    themeNode.addEventListener('error', finish, { once: true });
  });
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
  refreshShadowStyles(shadowRoot, options.styles);

  const container = document.createElement('div');
  container.className = ['root', options.className || ''].filter(Boolean).join(' ');
  const idSeed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ids = {
    prefix: `consent-${idSeed}`,
    bannerTitle: `consent-banner-title-${idSeed}`,
    bannerDescription: `consent-banner-description-${idSeed}`,
    dialogTitle: `consent-title-${idSeed}`,
    dialogDescription: `consent-desc-${idSeed}`,
  };
  const bannerDescribedBy = strings.bannerDescription ? ` aria-describedby="${ids.bannerDescription}"` : '';
  const dialogDescribedBy = strings.dialogDescription ? ` aria-describedby="${ids.dialogDescription}"` : '';

  const bannerTitleHtml = htmlString(strings.bannerTitle || 'Privacy choices');
  const bannerDescriptionHtml = htmlString(strings.bannerDescription || '');
  const dialogTitleHtml = htmlString(strings.dialogTitle || 'Consent preferences');
  const dialogDescriptionHtml = htmlString(strings.dialogDescription || '');

  container.innerHTML = `<section class="banner" role="region" aria-labelledby="${ids.bannerTitle}"${bannerDescribedBy}>
  <div class="content">
    <h2 class="title" id="${ids.bannerTitle}">${bannerTitleHtml}</h2>
    ${strings.bannerDescription ? `<p class="desc" id="${ids.bannerDescription}">${bannerDescriptionHtml}</p>` : ''}
    ${policyLinkMarkup(strings, options.links || [])}
  </div>
  <div class="actions">
    ${bannerActionsMarkup(options, strings)}
  </div>
</section>
<dialog class="dialog" aria-labelledby="${ids.dialogTitle}"${dialogDescribedBy} aria-modal="true">
  <form class="form" method="dialog">
    <div class="header">
      <h2 class="title" id="${ids.dialogTitle}" tabindex="-1">${dialogTitleHtml}</h2>
      <div class="actions">
        ${dialogHeaderActionsMarkup(options, strings)}
      </div>
    </div>
    ${strings.dialogDescription ? `<p class="desc" id="${ids.dialogDescription}">${dialogDescriptionHtml}</p>` : ''}
    <div class="cats">
      ${categoryRowsMarkup(options, ids)}
    </div>
    <div class="footer">
      <div class="actions">
        ${dialogFooterActionsMarkup(options, strings)}
      </div>
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
  let themeReady = false;
  let pendingBannerVisible = null;

  waitForThemeStyles(shadowRoot).then(() => {
    themeReady = true;
    if (pendingBannerVisible !== null) {
      banner.hidden = !pendingBannerVisible;
      pendingBannerVisible = null;
    }
  });

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
    if (!themeReady) {
      pendingBannerVisible = Boolean(visible);
      banner.hidden = true;
      return;
    }
    banner.hidden = !visible;
  }

  container.addEventListener('click', (event) => {
    const actionNode = event.target && event.target.closest
      ? event.target.closest('[data-action], [data-consent]')
      : null;
    if (!actionNode || !container.contains(actionNode)) {
      return;
    }

    const action = (actionNode.getAttribute('data-action') || actionNode.getAttribute('data-consent') || '').trim();
    if (!action) {
      return;
    }

    if (actionNode.tagName === 'A' && actionNode.hasAttribute('href')) {
      event.preventDefault();
    }

    const closeAfter = actionNode.getAttribute('data-close') === '1';
    const source = actionNode.closest('.dialog') ? 'dialog' : 'banner';

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
      refreshShadowStyles(shadowRoot, options.styles);
    },
    destroy: () => {
      if (host.parentNode) {
        host.parentNode.removeChild(host);
      }
    },
  };
}
