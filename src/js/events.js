export function emitConsentEvent(name, detail = {}) {
  if (typeof document === 'undefined') {
    return;
  }
  document.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
}

export function bindConsentTriggers(handler) {
  if (typeof document === 'undefined' || typeof handler !== 'function') {
    return () => {};
  }

  const onClick = (event) => {
    const target = event.target && event.target.closest ? event.target.closest('[data-consent]') : null;
    if (!target) {
      return;
    }
    const action = (target.getAttribute('data-consent') || '').trim();
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
