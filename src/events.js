export function emitConsentEvent(name, detail = {}) {
  if (typeof document === 'undefined') {
    return;
  }
  document.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
}

export function bindConsentTriggers(handler) {
  if (typeof document === 'undefined' || typeof handler !== 'function') {
    return () => {};
  }

  const onClick = (event) => {
    const target = event.target && event.target.closest ? event.target.closest('[data-consent-trigger]') : null;
    if (!target) {
      return;
    }
    const action = (target.getAttribute('data-consent-trigger') || '').trim();
    if (!action) {
      return;
    }
    handler(action, target, event);
  };

  document.addEventListener('click', onClick);
  return () => {
    document.removeEventListener('click', onClick);
  };
}
