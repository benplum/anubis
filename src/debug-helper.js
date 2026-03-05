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
        width: min(420px, calc(100vw - 24px));
        max-height: min(70vh, 680px);
        background: #0b1020;
        color: #e2e8f0;
        border: 1px solid #334155;
        border-radius: 10px;
        z-index: 100000;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace;
        display: grid;
        grid-template-rows: auto auto 1fr;
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
      .anubis-debug-section {
        padding: 8px 10px;
        border-bottom: 1px solid #334155;
      }
      .anubis-debug-label {
        font-size: 11px;
        opacity: 0.85;
        margin-bottom: 6px;
      }
      .anubis-debug-tokens {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
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
      .anubis-debug-log {
        min-height: 140px;
        overflow: auto;
        padding: 8px 10px;
        font-size: 11px;
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
      .anubis-debug--collapsed .anubis-debug-section,
      .anubis-debug--collapsed .anubis-debug-log {
        display: none;
      }
    `;
    document.head.appendChild(style);
  }

  function buildPanel() {
    const panel = document.createElement('aside');
    panel.className = 'anubis-debug';
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML = `
      <div class="anubis-debug-header">
        <span class="anubis-debug-title">Anubis Debug</span>
        <div>
          <button type="button" class="anubis-debug-btn" data-anubis-debug="toggle">Collapse</button>
          <button type="button" class="anubis-debug-btn" data-anubis-debug="clear">Clear log</button>
        </div>
      </div>
      <section class="anubis-debug-section">
        <div class="anubis-debug-label">Internal Consent State</div>
        <div class="anubis-debug-tokens" data-anubis-debug="tokens"></div>
      </section>
      <section class="anubis-debug-log" data-anubis-debug="log"></section>
    `;
    document.body.appendChild(panel);
    return panel;
  }

  function nowLabel() {
    return new Date().toLocaleTimeString();
  }

  function init() {
    ensureStyles();
    const panel = buildPanel();
    const tokensNode = panel.querySelector('[data-anubis-debug="tokens"]');
    const logNode = panel.querySelector('[data-anubis-debug="log"]');
    const toggleBtn = panel.querySelector('[data-anubis-debug="toggle"]');
    const clearBtn = panel.querySelector('[data-anubis-debug="clear"]');
    const logs = [];

    function renderTokens(state) {
      const entries = Object.entries(state || {});
      if (!entries.length) {
        tokensNode.innerHTML = '<span class="anubis-debug-token anubis-debug-token--denied">No consent state yet</span>';
        return;
      }

      tokensNode.innerHTML = entries
        .map(([key, value]) => {
          const granted = value === 'granted';
          const klass = granted ? 'anubis-debug-token--granted' : 'anubis-debug-token--denied';
          return `<span class="anubis-debug-token ${klass}">${key}: ${granted ? 'granted' : 'denied'}</span>`;
        })
        .join('');
    }

    function renderLogs() {
      logNode.innerHTML = logs
        .map((entry) => {
          return `<article class="anubis-debug-log-item">
            <div><span class="anubis-debug-log-time">${entry.time}</span> <span class="anubis-debug-log-name">${entry.name}</span></div>
            <pre class="anubis-debug-log-data">${entry.data}</pre>
          </article>`;
        })
        .join('');
    }

    function pushLog(name, detail) {
      logs.unshift({
        time: nowLabel(),
        name,
        data: safeStringify(detail || {}),
      });
      if (logs.length > 80) {
        logs.length = 80;
      }
      renderLogs();
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

    document.addEventListener('consent:ready', (event) => {
      pushLog('consent:ready', event.detail);
      updateFromDetail(event.detail);
    });

    document.addEventListener('consent:changed', (event) => {
      pushLog('consent:changed', event.detail);
      updateFromDetail(event.detail);
    });

    document.addEventListener('consent:revoked', (event) => {
      pushLog('consent:revoked', event.detail);
      updateFromDetail(event.detail);
    });

    if (window.Anubis && typeof window.Anubis.getState === 'function') {
      renderTokens(window.Anubis.getState());
      pushLog('debug:init', { state: window.Anubis.getState() });
    } else {
      renderTokens({});
      pushLog('debug:init', { waitingFor: 'consent:ready' });
    }

    toggleBtn.addEventListener('click', () => {
      panel.classList.toggle('anubis-debug--collapsed');
      toggleBtn.textContent = panel.classList.contains('anubis-debug--collapsed') ? 'Expand' : 'Collapse';
    });

    clearBtn.addEventListener('click', () => {
      logs.length = 0;
      renderLogs();
    });

    window.AnubisDebugPanel = {
      destroy() {
        panel.remove();
      },
    };
  }

  if (document.body) {
    init();
    return;
  }

  document.addEventListener('DOMContentLoaded', init, { once: true });
}());
