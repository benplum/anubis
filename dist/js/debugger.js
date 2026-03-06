(()=>{(function(){if(typeof window>"u"||typeof document>"u"||window.AnubisDebugPanel)return;function E(a){try{return JSON.stringify(a,null,2)}catch{return String(a)}}let C=`
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
    `;function _(){return new Date().toLocaleTimeString()}function T(){let a=document.createElement("div");a.className="debug-host";let i=a.attachShadow({mode:"open"}),r=document.createElement("style");r.textContent=C,i.appendChild(r);let s=document.createElement("aside");return s.className="debug",s.setAttribute("aria-live","polite"),s.innerHTML=`
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
    `,i.appendChild(s),document.body.appendChild(a),{panel:s,host:a}}function M(){return Array.isArray(window.dataLayer)||(window.dataLayer=[]),window.dataLayer}function x(){let{panel:a,host:i}=T(),r=a.querySelector('[data-anubis-debug="tokens"]'),s=a.querySelector('[data-anubis-debug="consent-log"]'),l=a.querySelector('[data-anubis-debug="datalayer-log"]'),j=a.querySelector('[data-anubis-debug="state-wrap"]'),m=a.querySelector('[data-anubis-debug="toggle"]'),q=a.querySelector('[data-anubis-debug="clear"]'),L=a.querySelectorAll("[data-anubis-debug-tab]"),g=[],p=[],v=[];function c(e){let t=Object.entries(e||{});if(!t.length){r.innerHTML='<div class="debug-state-row"><span class="debug-state-key">No consent state yet</span></div>';return}r.innerHTML=t.map(([n,d])=>{let o=d==="granted";return`<div class="debug-state-row"><span class="debug-state-key">${n}</span><span class="debug-token ${o?"debug-token--granted":"debug-token--denied"}">${o?"granted":"denied"}</span></div>`}).join("")}function f(e,t){e.innerHTML=t.map(n=>`<article class="debug-log-item">
            <div><span class="debug-log-time">${n.time}</span> <span class="debug-log-name">${n.name}</span></div>
            <pre class="debug-log-data">${n.data}</pre>
          </article>`).join("")}function k(e,t,n,d,o){e.unshift({time:_(),name:d,data:E(o||{})}),e.length>t&&(e.length=t),f(n,e)}function w(e,t){k(g,80,s,e,t)}function u(e,t){k(p,120,l,e,t)}function S(e){let t=e==="state",n=e==="internal",d=e==="datalayer";L.forEach(o=>{o.setAttribute("aria-selected",o.getAttribute("data-anubis-debug-tab")===e?"true":"false")}),j.hidden=!t,s.hidden=!n,l.hidden=!d}function z(e){if(e&&e.state){c(e.state);return}window.Anubis&&typeof window.Anubis.getState=="function"&&c(window.Anubis.getState())}L.forEach(e=>{e.addEventListener("click",()=>{S(e.getAttribute("data-anubis-debug-tab"))})});function I(e){let t=n=>{w(e,n.detail),z(n.detail)};return document.addEventListener(e,t),()=>document.removeEventListener(e,t)}["consent:ready","consent:updated","consent:revoked"].forEach(e=>{v.push(I(e))});let b=M(),D=b.push.bind(b);b.slice(-25).forEach((e,t)=>{u(`snapshot:${t+1}`,e)}),b.push=function(...t){let n=t[0],d=n&&typeof n=="object"&&n.event?String(n.event):"dataLayer.push",o=n&&typeof n=="object"&&(n.consentCommand||n.event)||"";return u(d,{command:o,args:t}),D(...t)};function $(){let e=null,t=null;function n(d){if(typeof window.gtag!="function")return!1;let o=window.gtag;if(o.__anubisDebugWrapped)return!0;let y=o,h=function(...A){return u("gtag()",{args:A}),y.apply(this,A)};return h.__anubisDebugWrapped=!0,h.__anubisDebugOriginal=y,window.gtag=h,u("gtag:hooked",{status:d}),!0}return n("wrapped-existing")||(u("gtag:hooked",{status:"not-found"}),e=window.setInterval(()=>{n("wrapped-late")&&(e&&(clearInterval(e),e=null),t&&(clearTimeout(t),t=null))},300),t=window.setTimeout(()=>{e&&(clearInterval(e),e=null)},1e4)),function(){e&&clearInterval(e),t&&clearTimeout(t);let o=window.gtag;typeof o=="function"&&o.__anubisDebugWrapped&&typeof o.__anubisDebugOriginal=="function"&&(window.gtag=o.__anubisDebugOriginal)}}let O=$();if(window.Anubis&&typeof window.Anubis.getState=="function"){let e=window.Anubis.getState();c(e),w("debug:init",{state:e})}else c({}),w("debug:init",{waitingFor:"consent:ready"});S("state"),m.addEventListener("click",()=>{a.classList.toggle("debug--collapsed"),m.textContent=a.classList.contains("debug--collapsed")?"Expand":"Collapse"}),q.addEventListener("click",()=>{g.length=0,p.length=0,f(s,g),f(l,p)}),window.AnubisDebugPanel={destroy(){v.forEach(e=>e()),b.push=D,O(),i.remove(),delete window.AnubisDebugPanel}}}if(document.body){x();return}document.addEventListener("DOMContentLoaded",x,{once:!0})})();})();
