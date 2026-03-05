(()=>{(function(){if(typeof window>"u"||typeof document>"u"||window.AnubisDebugPanel)return;function x(t){try{return JSON.stringify(t,null,2)}catch{return String(t)}}function C(){if(document.getElementById("anubis-debug-styles"))return;let t=document.createElement("style");t.id="anubis-debug-styles",t.textContent=`
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
    `,document.head.appendChild(t)}function m(){return new Date().toLocaleTimeString()}function E(){let t=document.createElement("aside");return t.className="anubis-debug",t.setAttribute("aria-live","polite"),t.innerHTML=`
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
        <div class="anubis-debug-label">Internal Consent State</div>
        <div class="anubis-debug-tokens" data-anubis-debug="tokens"></div>
      </section>
      <section class="anubis-debug-body" data-anubis-debug="consent-log" hidden></section>
      <section class="anubis-debug-body" data-anubis-debug="datalayer-log" hidden></section>
    `,document.body.appendChild(t),t}function _(){return Array.isArray(window.dataLayer)||(window.dataLayer=[]),window.dataLayer}function L(){C();let t=E(),c=t.querySelector('[data-anubis-debug="tokens"]'),p=t.querySelector('[data-anubis-debug="consent-log"]'),f=t.querySelector('[data-anubis-debug="datalayer-log"]'),T=t.querySelector('[data-anubis-debug="state-wrap"]'),k=t.querySelector('[data-anubis-debug="toggle"]'),I=t.querySelector('[data-anubis-debug="clear"]'),v=t.querySelectorAll("[data-anubis-debug-tab]"),s=[],d=[];function l(e){let n=Object.entries(e||{});if(!n.length){c.innerHTML='<span class="anubis-debug-token anubis-debug-token--denied">No consent state yet</span>';return}c.innerHTML=n.map(([a,i])=>{let o=i==="granted";return`<span class="anubis-debug-token ${o?"anubis-debug-token--granted":"anubis-debug-token--denied"}">${a}: ${o?"granted":"denied"}</span>`}).join("")}function g(e,n){e.innerHTML=n.map(a=>`<article class="anubis-debug-log-item">
            <div><span class="anubis-debug-log-time">${a.time}</span> <span class="anubis-debug-log-name">${a.name}</span></div>
            <pre class="anubis-debug-log-data">${a.data}</pre>
          </article>`).join("")}function u(e,n){s.unshift({time:m(),name:e,data:x(n||{})}),s.length>80&&(s.length=80),g(p,s)}function r(e,n){d.unshift({time:m(),name:e,data:x(n||{})}),d.length>120&&(d.length=120),g(f,d)}function S(e){let n=e==="state",a=e==="internal",i=e==="datalayer";v.forEach(o=>{o.setAttribute("aria-selected",o.getAttribute("data-anubis-debug-tab")===e?"true":"false")}),T.hidden=!n,p.hidden=!a,f.hidden=!i}function w(e){if(e&&e.state){l(e.state);return}window.Anubis&&typeof window.Anubis.getState=="function"&&l(window.Anubis.getState())}v.forEach(e=>{e.addEventListener("click",()=>{S(e.getAttribute("data-anubis-debug-tab"))})}),document.addEventListener("consent:ready",e=>{u("consent:ready",e.detail),w(e.detail)}),document.addEventListener("consent:changed",e=>{u("consent:changed",e.detail),w(e.detail)}),document.addEventListener("consent:revoked",e=>{u("consent:revoked",e.detail),w(e.detail)});let b=_(),D=b.push.bind(b);b.slice(-25).forEach((e,n)=>{r(`snapshot:${n+1}`,e)}),b.push=function(...n){let a=n[0],i=a&&typeof a=="object"&&a.event?String(a.event):"dataLayer.push",o=a&&typeof a=="object"&&(a.anubisConsentCommand||a.event)||"";return r(i,{command:o,args:n}),D(...n)};function M(){let e=null,n=null;function a(i){if(typeof window.gtag!="function")return!1;let o=window.gtag;if(o.__anubisDebugWrapped)return!0;let y=o,h=function(...A){return r("gtag()",{args:A}),y.apply(this,A)};return h.__anubisDebugWrapped=!0,h.__anubisDebugOriginal=y,window.gtag=h,r("gtag:hooked",{status:i}),!0}return a("wrapped-existing")||(r("gtag:hooked",{status:"not-found"}),e=window.setInterval(()=>{a("wrapped-late")&&(e&&(clearInterval(e),e=null),n&&(clearTimeout(n),n=null))},300),n=window.setTimeout(()=>{e&&(clearInterval(e),e=null)},1e4)),function(){e&&clearInterval(e),n&&clearTimeout(n);let o=window.gtag;typeof o=="function"&&o.__anubisDebugWrapped&&typeof o.__anubisDebugOriginal=="function"&&(window.gtag=o.__anubisDebugOriginal)}}let q=M();if(window.Anubis&&typeof window.Anubis.getState=="function"){let e=window.Anubis.getState();l(e),u("debug:init",{state:e})}else l({}),u("debug:init",{waitingFor:"consent:ready"});S("state"),k.addEventListener("click",()=>{t.classList.toggle("anubis-debug--collapsed"),k.textContent=t.classList.contains("anubis-debug--collapsed")?"Expand":"Collapse"}),I.addEventListener("click",()=>{s.length=0,d.length=0,g(p,s),g(f,d)}),window.AnubisDebugPanel={destroy(){b.push=D,q(),t.remove(),delete window.AnubisDebugPanel}}}if(document.body){L();return}document.addEventListener("DOMContentLoaded",L,{once:!0})})();})();
