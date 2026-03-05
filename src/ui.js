import { categoryGranted } from './config.js';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function categoryRowsMarkup(options) {
  const categoryNames = Object.keys(options.categories);
  return categoryNames
    .map((name) => {
      const text = (options.strings.categories && options.strings.categories[name]) || {};
      const label = escapeHtml(text.label || name);
      const description = escapeHtml(text.description || '');
      const disabled = name === 'necessary' ? 'disabled aria-disabled="true" checked' : '';
      return `<details class="anubis-category-row" data-anubis-category-row="${escapeHtml(name)}">
  <summary class="anubis-category-summary">
    <span class="anubis-category-summary-left">
      <span class="anubis-category-arrow" aria-hidden="true"></span>
      <span class="anubis-category-title">${label}</span>
    </span>
    <label class="anubis-category-switch" data-anubis-toggle-wrap="${escapeHtml(name)}">
      <input class="anubis-toggle" type="checkbox" data-anubis-category="${escapeHtml(name)}" ${disabled}>
    </label>
  </summary>
  ${description ? `<p class="anubis-category-description">${description}</p>` : ''}
</details>`;
    })
    .join('');
}

function policyLinkMarkup(strings, links) {
  const href = links.privacyPolicyUrl || links.cookiePolicyUrl;
  if (!href) {
    return '';
  }
  return `<a class="anubis-link" href="${escapeHtml(href)}" rel="noopener noreferrer">${escapeHtml(strings.policyLabel || 'Learn more')}</a>`;
}

export function renderConsentUI(options, hooks) {
  if (typeof document === 'undefined') {
    return {
      showBanner: () => {},
      openDialog: () => {},
      closeDialog: () => {},
      updateFromState: () => {},
      readCategoryChoices: () => ({}),
    };
  }

  const strings = options.strings;
  const container = document.createElement('div');
  container.className = 'anubis-root';

  container.innerHTML = `<section class="anubis-banner" role="region" aria-label="${escapeHtml(strings.bannerTitle || 'Privacy choices')}">
  <h2 class="anubis-title">${escapeHtml(strings.bannerTitle || '')}</h2>
  ${strings.bannerDescription ? `<p class="anubis-description">${escapeHtml(strings.bannerDescription)}</p>` : ''}
  ${policyLinkMarkup(strings, options.links || {})}
  <div class="anubis-actions">
    <button type="button" class="anubis-btn anubis-btn-secondary" data-consent-trigger="reject-all">${escapeHtml(strings.rejectAll || 'Reject all')}</button>
    <button type="button" class="anubis-btn anubis-btn-primary" data-consent-trigger="accept-all">${escapeHtml(strings.acceptAll || 'Accept all')}</button>
    <button type="button" class="anubis-btn anubis-btn-link" data-consent-trigger="open">${escapeHtml(strings.manage || 'Manage')}</button>
  </div>
</section>
<dialog class="anubis-dialog" aria-label="${escapeHtml(strings.dialogTitle || 'Consent preferences')}">
  <form class="anubis-form" method="dialog">
    <h3 class="anubis-dialog-title">${escapeHtml(strings.dialogTitle || '')}</h3>
    ${strings.dialogDescription ? `<p class="anubis-dialog-description">${escapeHtml(strings.dialogDescription)}</p>` : ''}
    <div class="anubis-categories">
      ${categoryRowsMarkup(options)}
    </div>
    <div class="anubis-dialog-actions">
      <button type="button" class="anubis-btn anubis-btn-secondary" data-anubis-action="cancel">${escapeHtml(strings.cancel || 'Cancel')}</button>
      <button type="submit" class="anubis-btn anubis-btn-primary">${escapeHtml(strings.save || 'Save')}</button>
    </div>
  </form>
</dialog>`;

  document.body.prepend(container);

  const banner = container.querySelector('.anubis-banner');
  const dialog = container.querySelector('.anubis-dialog');
  const form = container.querySelector('.anubis-form');
  const cancelButton = container.querySelector('[data-anubis-action="cancel"]');
  const toggleMap = {};
  Object.keys(options.categories).forEach((name) => {
    toggleMap[name] = container.querySelector(`input[data-anubis-category="${name}"]`);
  });

  container.querySelectorAll('.anubis-category-switch, .anubis-toggle').forEach((node) => {
    node.addEventListener('click', (event) => {
      event.stopPropagation();
    });
  });

  if (cancelButton) {
    cancelButton.addEventListener('click', () => {
      dialog.close();
    });
  }

  let lastFocus = null;
  function openDialog() {
    if (dialog.open) {
      return;
    }
    lastFocus = document.activeElement;
    dialog.showModal();
    const firstToggle = dialog.querySelector('input[data-anubis-category]:not([disabled])');
    if (firstToggle) {
      firstToggle.focus();
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

  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      hooks.onSave(readCategoryChoices());
      closeDialog();
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
  };
}
