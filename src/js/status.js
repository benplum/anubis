const STATUS_SELECTOR = '[data-consent-status]';

// Keeps every `[data-consent-status]` element on the page showing the visitor's
// sale/sharing opt-out status (CCPA regs §§ 7025(c)(6), 7026(g)). Elements added
// later (a footer parsed after Anubis, SPA renders) are filled as they appear.
export function createStatusTargets(getStatus) {
  if (typeof document === 'undefined') {
    return { render: () => {}, disconnect: () => {} };
  }

  function apply(element) {
    const { value, text } = getStatus();
    if (element.textContent !== text) {
      element.textContent = text;
    }
    element.setAttribute('data-consent-status-value', value);
    element.hidden = !text;
  }

  function render() {
    document.querySelectorAll(STATUS_SELECTOR).forEach(apply);
  }

  let observer = null;
  if (typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) {
            return;
          }
          if (node.matches(STATUS_SELECTOR)) {
            apply(node);
          }
          if (node.firstElementChild) {
            node.querySelectorAll(STATUS_SELECTOR).forEach(apply);
          }
        });
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  render();

  return {
    render,
    disconnect: () => {
      if (observer) {
        observer.disconnect();
      }
    },
  };
}
