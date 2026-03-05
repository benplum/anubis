(()=>{(function(){if(typeof window>"u"||typeof document>"u"||window.AnubisDebugPanel)return;function y(t){try{return JSON.stringify(t,null,2)}catch{return String(t)}}function S(){if(document.getElementById("anubis-debug-styles"))return;let t=document.createElement("style");t.id="anubis-debug-styles",t.textContent=`
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
    `,document.head.appendChild(t)}function x(){return new Date().toLocaleTimeString()}function A(){let t=document.createElement("aside");return t.className="anubis-debug",t.setAttribute("aria-live","polite"),t.innerHTML=`
      <div class="anubis-debug-header">
        <span class="anubis-debug-title">Anubis Debug</span>
        <div>
          <button type="button" class="anubis-debug-btn" data-anubis-debug="toggle">Collapse</button>
          <button type="button" class="anubis-debug-btn" data-anubis-debug="clear">Clear log</button>
        </div>
      </div>
      <div class="anubis-debug-tabs" role="tablist" aria-label="Anubis debug tabs">
        <button type="button" class="anubis-debug-tab" role="tab" aria-selected="true" data-anubis-debug-tab="state">State</button>
        <button type="button" class="anubis-debug-tab" role="tab" aria-selected="false" data-anubis-debug-tab="internal">Internal Log</button>
        <button type="button" class="anubis-debug-tab" role="tab" aria-selected="false" data-anubis-debug-tab="datalayer">DataLayer</button>
      </div>
      <section class="anubis-debug-section" data-anubis-debug="state-wrap">
        <div class="anubis-debug-label">Internal Consent State</div>
        <div class="anubis-debug-tokens" data-anubis-debug="tokens"></div>
      </section>
      <section class="anubis-debug-body" data-anubis-debug="consent-log" hidden></section>
      <section class="anubis-debug-body" data-anubis-debug="datalayer-log" hidden></section>
    `,document.body.appendChild(t),t}function E(){return Array.isArray(window.dataLayer)||(window.dataLayer=[]),window.dataLayer}function h(){S();let t=A(),c=t.querySelector('[data-anubis-debug="tokens"]'),g=t.querySelector('[data-anubis-debug="consent-log"]'),p=t.querySelector('[data-anubis-debug="datalayer-log"]'),C=t.querySelector('[data-anubis-debug="state-wrap"]'),m=t.querySelector('[data-anubis-debug="toggle"]'),D=t.querySelector('[data-anubis-debug="clear"]'),w=t.querySelectorAll("[data-anubis-debug-tab]"),d=[],s=[];function r(e){let n=Object.entries(e||{});if(!n.length){c.innerHTML='<span class="anubis-debug-token anubis-debug-token--denied">No consent state yet</span>';return}c.innerHTML=n.map(([a,b])=>{let o=b==="granted";return`<span class="anubis-debug-token ${o?"anubis-debug-token--granted":"anubis-debug-token--denied"}">${a}: ${o?"granted":"denied"}</span>`}).join("")}function l(e,n){e.innerHTML=n.map(a=>`<article class="anubis-debug-log-item">
            <div><span class="anubis-debug-log-time">${a.time}</span> <span class="anubis-debug-log-name">${a.name}</span></div>
            <pre class="anubis-debug-log-data">${a.data}</pre>
          </article>`).join("")}function i(e,n){d.unshift({time:x(),name:e,data:y(n||{})}),d.length>80&&(d.length=80),l(g,d)}function L(e,n){s.unshift({time:x(),name:e,data:y(n||{})}),s.length>120&&(s.length=120),l(p,s)}function k(e){let n=e==="state",a=e==="internal",b=e==="datalayer";w.forEach(o=>{o.setAttribute("aria-selected",o.getAttribute("data-anubis-debug-tab")===e?"true":"false")}),C.hidden=!n,g.hidden=!a,p.hidden=!b}function f(e){if(e&&e.state){r(e.state);return}window.Anubis&&typeof window.Anubis.getState=="function"&&r(window.Anubis.getState())}w.forEach(e=>{e.addEventListener("click",()=>{k(e.getAttribute("data-anubis-debug-tab"))})}),document.addEventListener("consent:ready",e=>{i("consent:ready",e.detail),f(e.detail)}),document.addEventListener("consent:changed",e=>{i("consent:changed",e.detail),f(e.detail)}),document.addEventListener("consent:revoked",e=>{i("consent:revoked",e.detail),f(e.detail)});let u=E(),v=u.push.bind(u);if(u.slice(-25).forEach((e,n)=>{L(`snapshot:${n+1}`,e)}),u.push=function(...n){let a=n[0],b=a&&typeof a=="object"&&a.event?String(a.event):"dataLayer.push",o=a&&typeof a=="object"&&(a.anubisConsentCommand||a.event)||"";return L(b,{command:o,args:n}),v(...n)},window.Anubis&&typeof window.Anubis.getState=="function"){let e=window.Anubis.getState();r(e),i("debug:init",{state:e})}else r({}),i("debug:init",{waitingFor:"consent:ready"});k("state"),m.addEventListener("click",()=>{t.classList.toggle("anubis-debug--collapsed"),m.textContent=t.classList.contains("anubis-debug--collapsed")?"Expand":"Collapse"}),D.addEventListener("click",()=>{d.length=0,s.length=0,l(g,d),l(p,s)}),window.AnubisDebugPanel={destroy(){u.push=v,t.remove(),delete window.AnubisDebugPanel}}}if(document.body){h();return}document.addEventListener("DOMContentLoaded",h,{once:!0})})();})();
