(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  if (window.AnubisDebugPanel) {
    return;
  }

  const DEBUG_PREFIX = '[Anubis Debug]';

  function getDebugOptions() {
    const input = window.AnubisDebugOptions && typeof window.AnubisDebugOptions === 'object'
      ? window.AnubisDebugOptions
      : {};
    const requestedMode = typeof input.mode === 'string' ? input.mode.trim().toLowerCase() : '';
    return {
      mode: requestedMode === 'console' ? 'console' : 'panel',
    };
  }

  function safeStringify(value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch (_error) {
      return String(value);
    }
  }

  const DEBUG_STYLES = `
      .debug {
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
      .debug-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-bottom: 1px solid #334155;
        font-size: 12px;
      }
      .debug-title {
        font-weight: 700;
      }
      .debug-btn {
        border: 1px solid #475569;
        background: #111827;
        color: #e2e8f0;
        border-radius: 6px;
        padding: 4px 8px;
        cursor: pointer;
        font-size: 11px;
      }
      .debug-tabs {
        display: flex;
        gap: 6px;
        padding: 6px 10px;
        border-bottom: 1px solid #334155;
      }
      .debug-tab {
        border: 1px solid #475569;
        background: #111827;
        color: #e2e8f0;
        border-radius: 6px;
        padding: 4px 8px;
        cursor: pointer;
        font-size: 11px;
      }
      .debug-tab[aria-selected='true'] {
        background: #1d4ed8;
        border-color: #1d4ed8;
        color: #ffffff;
      }
      .debug-section {
        padding: 8px 10px;
        border-bottom: 1px solid #334155;
      }
      .debug-tokens {
        display: grid;
        gap: 6px;
      }
      .debug-state-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 6px 0;
      }
      .debug-state-row + .debug-state-row {
        border-top: 1px solid #334155;
      }
      .debug-state-key {
        font-size: 11px;
        color: #e2e8f0;
        word-break: break-word;
      }
      .debug-token {
        font-size: 11px;
        border-radius: 999px;
        padding: 3px 8px;
        border: 1px solid transparent;
        white-space: nowrap;
      }
      .debug-token--granted {
        background: #052e16;
        border-color: #166534;
        color: #bbf7d0;
      }
      .debug-token--denied {
        background: #450a0a;
        border-color: #7f1d1d;
        color: #fecaca;
      }
      .debug-body {
        min-height: 140px;
        overflow: auto;
        padding: 8px 10px;
        font-size: 11px;
      }
      .debug-body[hidden] {
        display: none;
      }
      .debug-log-item {
        padding: 6px 0;
        border-bottom: 1px dashed #334155;
      }
      .debug-log-item:last-child {
        border-bottom: 0;
      }
      .debug-log-time {
        opacity: 0.75;
      }
      .debug-log-name {
        color: #93c5fd;
        font-weight: 700;
      }
      .debug-log-data {
        margin: 4px 0 0;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .debug--collapsed {
        grid-template-rows: auto;
        max-height: none;
      }
      .debug--collapsed .debug-tabs,
      .debug--collapsed .debug-section,
      .debug--collapsed .debug-body {
        display: none;
      }
    `;

  function nowLabel() {
    return new Date().toLocaleTimeString();
  }

  function normalizeDoNotTrackValue(value) {
    if (value === null || typeof value === 'undefined') {
      return '';
    }
    return String(value).trim().toLowerCase();
  }

  function readPrivacySignalStatus() {
    const gpcCandidates = [
      typeof navigator !== 'undefined' ? navigator.globalPrivacyControl : null,
      typeof window !== 'undefined' ? window.globalPrivacyControl : null,
    ];
    const gpcRaw = gpcCandidates.find((candidate) => candidate !== null && typeof candidate !== 'undefined');
    const gpcEnabled = gpcCandidates.some((candidate) => candidate === true);

    const dntCandidates = [
      typeof navigator !== 'undefined' ? navigator.doNotTrack : null,
      typeof window !== 'undefined' ? window.doNotTrack : null,
      typeof navigator !== 'undefined' ? navigator.msDoNotTrack : null,
    ];
    const dntRaw = dntCandidates.find((candidate) => candidate !== null && typeof candidate !== 'undefined');
    const dntEnabled = dntCandidates.some((candidate) => {
      const normalized = normalizeDoNotTrackValue(candidate);
      return normalized === '1' || normalized === 'yes';
    });

    return {
      gpc: {
        enabled: gpcEnabled,
        label: gpcEnabled ? 'enabled' : 'disabled',
        raw: typeof gpcRaw === 'undefined' ? '' : String(gpcRaw),
      },
      dnt: {
        enabled: dntEnabled,
        label: dntEnabled ? 'enabled' : 'disabled',
        raw: typeof dntRaw === 'undefined' ? '' : String(dntRaw),
      },
    };
  }

  function buildPanel() {
    const host = document.createElement('div');
    host.className = 'debug-host';
    const shadowRoot = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = DEBUG_STYLES;
    shadowRoot.appendChild(style);

    const panel = document.createElement('aside');
    panel.className = 'debug';
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML = `
      <div class="debug-header">
        <span class="debug-title">Anubis</span>
        <div>
          <button type="button" class="debug-btn" data-anubis-debug="toggle">Collapse</button>
          <button type="button" class="debug-btn" data-anubis-debug="clear">Clear log</button>
        </div>
      </div>
      <div class="debug-tabs" role="tablist" aria-label="Anubis debug tabs">
        <button type="button" class="debug-tab" role="tab" aria-selected="true" data-anubis-debug-tab="state">State</button>
        <button type="button" class="debug-tab" role="tab" aria-selected="false" data-anubis-debug-tab="internal">Log</button>
        <button type="button" class="debug-tab" role="tab" aria-selected="false" data-anubis-debug-tab="datalayer">DataLayer</button>
      </div>
      <section class="debug-section" data-anubis-debug="state-wrap">
        <div class="debug-tokens" data-anubis-debug="tokens"></div>
      </section>
      <section class="debug-body" data-anubis-debug="consent-log" hidden></section>
      <section class="debug-body" data-anubis-debug="datalayer-log" hidden></section>
    `;
    shadowRoot.appendChild(panel);
    document.body.appendChild(host);
    return { panel, host };
  }

  function ensureDataLayer() {
    if (!Array.isArray(window.dataLayer)) {
      window.dataLayer = [];
    }
    return window.dataLayer;
  }

  function init() {
    const debugOptions = getDebugOptions();
    const useConsoleMode = debugOptions.mode === 'console';
    const panelParts = useConsoleMode ? null : buildPanel();
    const panel = panelParts ? panelParts.panel : null;
    const host = panelParts ? panelParts.host : null;
    const tokensNode = panel ? panel.querySelector('[data-anubis-debug="tokens"]') : null;
    const consentLogNode = panel ? panel.querySelector('[data-anubis-debug="consent-log"]') : null;
    const dataLayerLogNode = panel ? panel.querySelector('[data-anubis-debug="datalayer-log"]') : null;
    const stateWrap = panel ? panel.querySelector('[data-anubis-debug="state-wrap"]') : null;
    const toggleBtn = panel ? panel.querySelector('[data-anubis-debug="toggle"]') : null;
    const clearBtn = panel ? panel.querySelector('[data-anubis-debug="clear"]') : null;
    const tabs = panel ? panel.querySelectorAll('[data-anubis-debug-tab]') : [];
    const consentLogs = [];
    const dataLayerLogs = [];
    const consentEventUnsubscribers = [];

    function renderTokens(state) {
      const entries = Object.entries(state || {});
      const signalStatus = readPrivacySignalStatus();

      const consentRows = entries.length
        ? entries
        .map(([key, value]) => {
          const granted = value === 'granted';
          const klass = granted ? 'debug-token--granted' : 'debug-token--denied';
          return `<div class="debug-state-row"><span class="debug-state-key">${key}</span><span class="debug-token ${klass}">${granted ? 'granted' : 'denied'}</span></div>`;
        })
        .join('')
        : '<div class="debug-state-row"><span class="debug-state-key">No consent state yet</span></div>';

      const signalRows = [
        { key: 'GPC', value: signalStatus.gpc },
        { key: 'DNT', value: signalStatus.dnt },
      ]
        .map((entry) => {
          const klass = entry.value.enabled ? 'debug-token--granted' : 'debug-token--denied';
          const rawSuffix = entry.value.raw ? ` (${entry.value.raw})` : '';
          return `<div class="debug-state-row"><span class="debug-state-key">${entry.key}</span><span class="debug-token ${klass}">${entry.value.label}${rawSuffix}</span></div>`;
        })
        .join('');

      if (tokensNode) {
        tokensNode.innerHTML = `${consentRows}${signalRows}`;
      }

      return {
        consent: state || {},
        signals: {
          gpc: signalStatus.gpc,
          dnt: signalStatus.dnt,
        },
      };
    }

    function renderLog(targetNode, entries) {
      if (!targetNode) {
        return;
      }
      targetNode.innerHTML = entries
        .map((entry) => {
          return `<article class="debug-log-item">
            <div><span class="debug-log-time">${entry.time}</span> <span class="debug-log-name">${entry.name}</span></div>
            <pre class="debug-log-data">${entry.data}</pre>
          </article>`;
        })
        .join('');
    }

    function pushLog(logs, maxEntries, targetNode, name, detail) {
      const time = nowLabel();
      logs.unshift({
        time,
        name,
        data: safeStringify(detail || {}),
      });
      if (logs.length > maxEntries) {
        logs.length = maxEntries;
      }
      renderLog(targetNode, logs);

      if (useConsoleMode) {
        console.log(`${DEBUG_PREFIX} ${time} ${name}`, detail || {});
      }
    }

    function pushConsentLog(name, detail) {
      pushLog(consentLogs, 80, consentLogNode, name, detail);
    }

    function pushDataLayerLog(name, detail) {
      pushLog(dataLayerLogs, 120, dataLayerLogNode, name, detail);
    }

    function setTab(tabName) {
      if (!panel) {
        return;
      }
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
        return renderTokens(detail.state);
      }
      if (window.Anubis && typeof window.Anubis.getState === 'function') {
        return renderTokens(window.Anubis.getState());
      }
      return renderTokens({});
    }

    if (panel) {
      tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          setTab(tab.getAttribute('data-anubis-debug-tab'));
        });
      });
    }

    function bindConsentLogEvent(name) {
      const handler = (event) => {
        pushConsentLog(name, event.detail);
        const tokenSnapshot = updateFromDetail(event.detail);
        if (useConsoleMode && tokenSnapshot) {
          console.log(`${DEBUG_PREFIX} state`, tokenSnapshot);
        }
      };
      document.addEventListener(name, handler);
      return () => document.removeEventListener(name, handler);
    }

    [
      'consent:ready',
      'consent:updated',
      'consent:revoked',
      'consent:script-blocked',
      'consent:script-activated',
    ].forEach((eventName) => {
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
      const command = first && typeof first === 'object' ? first.consentCommand || first.event || '' : '';

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
      const tokenSnapshot = renderTokens(state);
      pushConsentLog('debug:init', { state });
      if (useConsoleMode) {
        console.log(`${DEBUG_PREFIX} mode`, { mode: 'console' });
        console.log(`${DEBUG_PREFIX} state`, tokenSnapshot);
      }
    } else {
      const tokenSnapshot = renderTokens({});
      pushConsentLog('debug:init', { waitingFor: 'consent:ready' });
      if (useConsoleMode) {
        console.log(`${DEBUG_PREFIX} mode`, { mode: 'console' });
        console.log(`${DEBUG_PREFIX} state`, tokenSnapshot);
      }
    }

    setTab('state');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        panel.classList.toggle('debug--collapsed');
        toggleBtn.textContent = panel.classList.contains('debug--collapsed') ? 'Expand' : 'Collapse';
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        consentLogs.length = 0;
        dataLayerLogs.length = 0;
        renderLog(consentLogNode, consentLogs);
        renderLog(dataLayerLogNode, dataLayerLogs);
      });
    }

    window.AnubisDebugPanel = {
      destroy() {
        consentEventUnsubscribers.forEach((unsubscribe) => unsubscribe());
        dataLayer.push = originalPush;
        cleanupGtagLogger();
        if (host) {
          host.remove();
        }
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
