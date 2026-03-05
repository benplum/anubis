(()=>{(function(){if(typeof window>"u"||typeof document>"u"||window.AnubisDebugPanel)return;function g(e){try{return JSON.stringify(e,null,2)}catch{return String(e)}}function c(){if(document.getElementById("anubis-debug-styles"))return;let e=document.createElement("style");e.id="anubis-debug-styles",e.textContent=`
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
    `,document.head.appendChild(e)}function p(){let e=document.createElement("aside");return e.className="anubis-debug",e.setAttribute("aria-live","polite"),e.innerHTML=`
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
    `,document.body.appendChild(e),e}function f(){return new Date().toLocaleTimeString()}function u(){c();let e=p(),d=e.querySelector('[data-anubis-debug="tokens"]'),m=e.querySelector('[data-anubis-debug="log"]'),b=e.querySelector('[data-anubis-debug="toggle"]'),x=e.querySelector('[data-anubis-debug="clear"]'),t=[];function o(n){let i=Object.entries(n||{});if(!i.length){d.innerHTML='<span class="anubis-debug-token anubis-debug-token--denied">No consent state yet</span>';return}d.innerHTML=i.map(([w,y])=>{let l=y==="granted";return`<span class="anubis-debug-token ${l?"anubis-debug-token--granted":"anubis-debug-token--denied"}">${w}: ${l?"granted":"denied"}</span>`}).join("")}function r(){m.innerHTML=t.map(n=>`<article class="anubis-debug-log-item">
            <div><span class="anubis-debug-log-time">${n.time}</span> <span class="anubis-debug-log-name">${n.name}</span></div>
            <pre class="anubis-debug-log-data">${n.data}</pre>
          </article>`).join("")}function a(n,i){t.unshift({time:f(),name:n,data:g(i||{})}),t.length>80&&(t.length=80),r()}function s(n){if(n&&n.state){o(n.state);return}window.Anubis&&typeof window.Anubis.getState=="function"&&o(window.Anubis.getState())}document.addEventListener("consent:ready",n=>{a("consent:ready",n.detail),s(n.detail)}),document.addEventListener("consent:changed",n=>{a("consent:changed",n.detail),s(n.detail)}),document.addEventListener("consent:revoked",n=>{a("consent:revoked",n.detail),s(n.detail)}),window.Anubis&&typeof window.Anubis.getState=="function"?(o(window.Anubis.getState()),a("debug:init",{state:window.Anubis.getState()})):(o({}),a("debug:init",{waitingFor:"consent:ready"})),b.addEventListener("click",()=>{e.classList.toggle("anubis-debug--collapsed"),b.textContent=e.classList.contains("anubis-debug--collapsed")?"Expand":"Collapse"}),x.addEventListener("click",()=>{t.length=0,r()}),window.AnubisDebugPanel={destroy(){e.remove()}}}if(document.body){u();return}document.addEventListener("DOMContentLoaded",u,{once:!0})})();})();
