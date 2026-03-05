(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  if (window.AnubisDebugPanel) {
    return;
  }

  function safeStringify(value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch (_error) {
      return String(value);
    }
  }

  function ensureStyles() {
    if (document.getElementById('anubis-debug-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'anubis-debug-styles';
    style.textContent = `
      .anubis-debug {
        position: fixed;
        right: 12px;
        bottom: 12px;
        width: min(460px, calc(100vw - 24px));
        max-height: min(72vh, 720px);
        background: #0b1020;
        color: #e2e8f0;
        border: 1px solid #334155;
        border-radius: 10px;
        z-index: 100000;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace;
        display: grid;
        grid-template-rows: auto auto auto 1fr;
        overflow: hidden;
      }
      .anubis-debug-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-bottom: 1px solid #334155;
        font-size: 12px;
      }
      .anubis-debug-title {
        font-weight: 700;
      }
      .anubis-debug-btn {
        border: 1px solid #475569;
        background: #111827;
        color: #e2e8f0;
        border-radius: 6px;
        padding: 4px 8px;
        cursor: pointer;
        font-size: 11px;
      }
      .anubis-debug-tabs {
        display: flex;
        gap: 6px;
        padding: 6px 10px;
        border-bottom: 1px solid #334155;
      }
      .anubis-debug-tab {
        border: 1px solid #475569;
        background: #111827;
        color: #e2e8f0;
        border-radius: 6px;
        padding: 4px 8px;
        cursor: pointer;
        font-size: 11px;
      }
      .anubis-debug-tab[aria-selected='true'] {
        background: #1d4ed8;
        border-color: #1d4ed8;
        color: #ffffff;
      }
      .anubis-debug-section {
        padding: 8px 10px;
        border-bottom: 1px solid #334155;
      }
      .anubis-debug-tokens {
        display: grid;
        gap: 6px;
      }
      .anubis-debug-state-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 6px 0;
      }
      .anubis-debug-state-row + .anubis-debug-state-row {
        border-top: 1px solid #334155;
      }
      .anubis-debug-state-key {
        font-size: 11px;
        color: #e2e8f0;
        word-break: break-word;
      }
      .anubis-debug-token {
        font-size: 11px;
        border-radius: 999px;
        padding: 3px 8px;
        border: 1px solid transparent;
        white-space: nowrap;
      }
      .anubis-debug-token--granted {
        background: #052e16;
        border-color: #166534;
        color: #bbf7d0;
      }
      .anubis-debug-token--denied {
        background: #450a0a;
        border-color: #7f1d1d;
        color: #fecaca;
      }
      .anubis-debug-body {
        min-height: 140px;
        overflow: auto;
        padding: 8px 10px;
        font-size: 11px;
      }
      .anubis-debug-body[hidden] {
        display: none;
      }
      .anubis-debug-log-item {
        padding: 6px 0;
        border-bottom: 1px dashed #334155;
      }
      .anubis-debug-log-item:last-child {
        border-bottom: 0;
      }
      .anubis-debug-log-time {
        opacity: 0.75;
      }
      .anubis-debug-log-name {
        color: #93c5fd;
        font-weight: 700;
      }
      .anubis-debug-log-data {
        margin: 4px 0 0;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .anubis-debug--collapsed {
        grid-template-rows: auto;
        max-height: none;
      }
      .anubis-debug--collapsed .anubis-debug-tabs,
      .anubis-debug--collapsed .anubis-debug-section,
      .anubis-debug--collapsed .anubis-debug-body {
        display: none;
      }
    `;

    document.head.appendChild(style);
  }

  function nowLabel() {
    return new Date().toLocaleTimeString();
  }

  function buildPanel() {
    const panel = document.createElement('aside');
    panel.className = 'anubis-debug';
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML = `
      <div class="anubis-debug-header">
        <span class="anubis-debug-title">Anubis</span>
        <div>
          <button type="button" class="anubis-debug-btn" data-anubis-debug="toggle">Collapse</button>
          <button type="button" class="anubis-debug-btn" data-anubis-debug="clear">Clear log</button>
        </div>
      </div>
      <div class="anubis-debug-tabs" role="tablist" aria-label="Anubis debug tabs">
        <button type="button" class="anubis-debug-tab" role="tab" aria-selected="true" data-anubis-debug-tab="state">State</button>
        <button type="button" class="anubis-debug-tab" role="tab" aria-selected="false" data-anubis-debug-tab="internal">Log</button>
        <button type="button" class="anubis-debug-tab" role="tab" aria-selected="false" data-anubis-debug-tab="datalayer">DataLayer</button>
      </div>
      <section class="anubis-debug-section" data-anubis-debug="state-wrap">
        <div class="anubis-debug-tokens" data-anubis-debug="tokens"></div>
      </section>
      <section class="anubis-debug-body" data-anubis-debug="consent-log" hidden></section>
      <section class="anubis-debug-body" data-anubis-debug="datalayer-log" hidden></section>
    `;
    document.body.appendChild(panel);
    return panel;
  }

  function ensureDataLayer() {
    if (!Array.isArray(window.dataLayer)) {
      window.dataLayer = [];
    }
    return window.dataLayer;
  }

  function init() {
    ensureStyles();
    const panel = buildPanel();
    const tokensNode = panel.querySelector('[data-anubis-debug="tokens"]');
    const consentLogNode = panel.querySelector('[data-anubis-debug="consent-log"]');
    const dataLayerLogNode = panel.querySelector('[data-anubis-debug="datalayer-log"]');
    const stateWrap = panel.querySelector('[data-anubis-debug="state-wrap"]');
    const toggleBtn = panel.querySelector('[data-anubis-debug="toggle"]');
    const clearBtn = panel.querySelector('[data-anubis-debug="clear"]');
    const tabs = panel.querySelectorAll('[data-anubis-debug-tab]');
    const consentLogs = [];
    const dataLayerLogs = [];
    const consentEventUnsubscribers = [];

    function renderTokens(state) {
      const entries = Object.entries(state || {});
      if (!entries.length) {
        tokensNode.innerHTML = '<div class="anubis-debug-state-row"><span class="anubis-debug-state-key">No consent state yet</span></div>';
        return;
      }

      tokensNode.innerHTML = entries
        .map(([key, value]) => {
          const granted = value === 'granted';
          const klass = granted ? 'anubis-debug-token--granted' : 'anubis-debug-token--denied';
          return `<div class="anubis-debug-state-row"><span class="anubis-debug-state-key">${key}</span><span class="anubis-debug-token ${klass}">${granted ? 'granted' : 'denied'}</span></div>`;
        })
        .join('');
    }

    function renderLog(targetNode, entries) {
      targetNode.innerHTML = entries
        .map((entry) => {
          return `<article class="anubis-debug-log-item">
            <div><span class="anubis-debug-log-time">${entry.time}</span> <span class="anubis-debug-log-name">${entry.name}</span></div>
            <pre class="anubis-debug-log-data">${entry.data}</pre>
          </article>`;
        })
        .join('');
    }

    function pushLog(logs, maxEntries, targetNode, name, detail) {
      logs.unshift({
        time: nowLabel(),
        name,
        data: safeStringify(detail || {}),
      });
      if (logs.length > maxEntries) {
        logs.length = maxEntries;
      }
      renderLog(targetNode, logs);
    }

    function pushConsentLog(name, detail) {
      pushLog(consentLogs, 80, consentLogNode, name, detail);
    }

    function pushDataLayerLog(name, detail) {
      pushLog(dataLayerLogs, 120, dataLayerLogNode, name, detail);
    }

    function setTab(tabName) {
      const showState = tabName === 'state';
      const showInternal = tabName === 'internal';
      const showDataLayer = tabName === 'datalayer';
      tabs.forEach((tab) => {
        tab.setAttribute('aria-selected', tab.getAttribute('data-anubis-debug-tab') === tabName ? 'true' : 'false');
      });
      stateWrap.hidden = !showState;
      consentLogNode.hidden = !showInternal;
      dataLayerLogNode.hidden = !showDataLayer;
    }

    function updateFromDetail(detail) {
      if (detail && detail.state) {
        renderTokens(detail.state);
        return;
      }
      if (window.Anubis && typeof window.Anubis.getState === 'function') {
        renderTokens(window.Anubis.getState());
      }
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        setTab(tab.getAttribute('data-anubis-debug-tab'));
      });
    });

    function bindConsentLogEvent(name) {
      const handler = (event) => {
        pushConsentLog(name, event.detail);
        updateFromDetail(event.detail);
      };
      document.addEventListener(name, handler);
      return () => document.removeEventListener(name, handler);
    }

    ['consent:ready', 'consent:changed', 'consent:revoked'].forEach((eventName) => {
      consentEventUnsubscribers.push(bindConsentLogEvent(eventName));
    });

    const dataLayer = ensureDataLayer();
    const originalPush = dataLayer.push.bind(dataLayer);

    const initialSlice = dataLayer.slice(-25);
    initialSlice.forEach((item, index) => {
      pushDataLayerLog(`snapshot:${index + 1}`, item);
    });

    dataLayer.push = function anubisDebugDataLayerPush(...items) {
      const first = items[0];
      const eventName = first && typeof first === 'object' && first.event ? String(first.event) : 'dataLayer.push';
      const command = first && typeof first === 'object' ? first.cmpCommand || first.event || '' : '';

      pushDataLayerLog(eventName, {
        command,
        args: items,
      });

      return originalPush(...items);
    };

    function attachGtagLogger() {
      let pollId = null;
      let timeoutId = null;

      function wrapCurrent(reason) {
        if (typeof window.gtag !== 'function') {
          return false;
        }

        const current = window.gtag;
        if (current.__anubisDebugWrapped) {
          return true;
        }

        const original = current;
        const wrapped = function anubisDebugGtag(...args) {
          pushDataLayerLog('gtag()', { args });
          return original.apply(this, args);
        };

        wrapped.__anubisDebugWrapped = true;
        wrapped.__anubisDebugOriginal = original;
        window.gtag = wrapped;
        pushDataLayerLog('gtag:hooked', { status: reason });
        return true;
      }

      if (!wrapCurrent('wrapped-existing')) {
        pushDataLayerLog('gtag:hooked', { status: 'not-found' });

        pollId = window.setInterval(() => {
          if (wrapCurrent('wrapped-late')) {
            if (pollId) {
              clearInterval(pollId);
              pollId = null;
            }
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
          }
        }, 300);

        timeoutId = window.setTimeout(() => {
          if (pollId) {
            clearInterval(pollId);
            pollId = null;
          }
        }, 10000);
      }

      return function cleanupGtagLogger() {
        if (pollId) {
          clearInterval(pollId);
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        const current = window.gtag;
        if (typeof current === 'function' && current.__anubisDebugWrapped && typeof current.__anubisDebugOriginal === 'function') {
          window.gtag = current.__anubisDebugOriginal;
        }
      };
    }

    const cleanupGtagLogger = attachGtagLogger();

    if (window.Anubis && typeof window.Anubis.getState === 'function') {
      const state = window.Anubis.getState();
      renderTokens(state);
      pushConsentLog('debug:init', { state });
    } else {
      renderTokens({});
      pushConsentLog('debug:init', { waitingFor: 'consent:ready' });
    }

    setTab('state');

    toggleBtn.addEventListener('click', () => {
      panel.classList.toggle('anubis-debug--collapsed');
      toggleBtn.textContent = panel.classList.contains('anubis-debug--collapsed') ? 'Expand' : 'Collapse';
    });

    clearBtn.addEventListener('click', () => {
      consentLogs.length = 0;
      dataLayerLogs.length = 0;
      renderLog(consentLogNode, consentLogs);
      renderLog(dataLayerLogNode, dataLayerLogs);
    });

    window.AnubisDebugPanel = {
      destroy() {
        consentEventUnsubscribers.forEach((unsubscribe) => unsubscribe());
        dataLayer.push = originalPush;
        cleanupGtagLogger();
        panel.remove();
        delete window.AnubisDebugPanel;
      },
    };
  }

  if (document.body) {
    init();
    return;
  }

  document.addEventListener('DOMContentLoaded', init, { once: true });
}());
