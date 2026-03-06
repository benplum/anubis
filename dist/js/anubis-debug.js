(()=>{(function(){if(typeof window>"u"||typeof document>"u"||window.AnubisDebugPanel)return;function E(a){try{return JSON.stringify(a,null,2)}catch{return String(a)}}let C=`
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
    `;function _(){return new Date().toLocaleTimeString()}function T(){let a=document.createElement("div");a.className="anubis-debug-host";let d=a.attachShadow({mode:"open"}),u=document.createElement("style");u.textContent=C,d.appendChild(u);let s=document.createElement("aside");return s.className="anubis-debug",s.setAttribute("aria-live","polite"),s.innerHTML=`
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
    `,d.appendChild(s),document.body.appendChild(a),{panel:s,host:a}}function M(){return Array.isArray(window.dataLayer)||(window.dataLayer=[]),window.dataLayer}function x(){let{panel:a,host:d}=T(),u=a.querySelector('[data-anubis-debug="tokens"]'),s=a.querySelector('[data-anubis-debug="consent-log"]'),l=a.querySelector('[data-anubis-debug="datalayer-log"]'),j=a.querySelector('[data-anubis-debug="state-wrap"]'),m=a.querySelector('[data-anubis-debug="toggle"]'),q=a.querySelector('[data-anubis-debug="clear"]'),L=a.querySelectorAll("[data-anubis-debug-tab]"),g=[],p=[],v=[];function c(e){let t=Object.entries(e||{});if(!t.length){u.innerHTML='<div class="anubis-debug-state-row"><span class="anubis-debug-state-key">No consent state yet</span></div>';return}u.innerHTML=t.map(([n,i])=>{let o=i==="granted";return`<div class="anubis-debug-state-row"><span class="anubis-debug-state-key">${n}</span><span class="anubis-debug-token ${o?"anubis-debug-token--granted":"anubis-debug-token--denied"}">${o?"granted":"denied"}</span></div>`}).join("")}function f(e,t){e.innerHTML=t.map(n=>`<article class="anubis-debug-log-item">
            <div><span class="anubis-debug-log-time">${n.time}</span> <span class="anubis-debug-log-name">${n.name}</span></div>
            <pre class="anubis-debug-log-data">${n.data}</pre>
          </article>`).join("")}function k(e,t,n,i,o){e.unshift({time:_(),name:i,data:E(o||{})}),e.length>t&&(e.length=t),f(n,e)}function w(e,t){k(g,80,s,e,t)}function r(e,t){k(p,120,l,e,t)}function S(e){let t=e==="state",n=e==="internal",i=e==="datalayer";L.forEach(o=>{o.setAttribute("aria-selected",o.getAttribute("data-anubis-debug-tab")===e?"true":"false")}),j.hidden=!t,s.hidden=!n,l.hidden=!i}function z(e){if(e&&e.state){c(e.state);return}window.Anubis&&typeof window.Anubis.getState=="function"&&c(window.Anubis.getState())}L.forEach(e=>{e.addEventListener("click",()=>{S(e.getAttribute("data-anubis-debug-tab"))})});function I(e){let t=n=>{w(e,n.detail),z(n.detail)};return document.addEventListener(e,t),()=>document.removeEventListener(e,t)}["consent:ready","consent:changed","consent:revoked"].forEach(e=>{v.push(I(e))});let b=M(),D=b.push.bind(b);b.slice(-25).forEach((e,t)=>{r(`snapshot:${t+1}`,e)}),b.push=function(...t){let n=t[0],i=n&&typeof n=="object"&&n.event?String(n.event):"dataLayer.push",o=n&&typeof n=="object"&&(n.cmpCommand||n.event)||"";return r(i,{command:o,args:t}),D(...t)};function $(){let e=null,t=null;function n(i){if(typeof window.gtag!="function")return!1;let o=window.gtag;if(o.__anubisDebugWrapped)return!0;let y=o,h=function(...A){return r("gtag()",{args:A}),y.apply(this,A)};return h.__anubisDebugWrapped=!0,h.__anubisDebugOriginal=y,window.gtag=h,r("gtag:hooked",{status:i}),!0}return n("wrapped-existing")||(r("gtag:hooked",{status:"not-found"}),e=window.setInterval(()=>{n("wrapped-late")&&(e&&(clearInterval(e),e=null),t&&(clearTimeout(t),t=null))},300),t=window.setTimeout(()=>{e&&(clearInterval(e),e=null)},1e4)),function(){e&&clearInterval(e),t&&clearTimeout(t);let o=window.gtag;typeof o=="function"&&o.__anubisDebugWrapped&&typeof o.__anubisDebugOriginal=="function"&&(window.gtag=o.__anubisDebugOriginal)}}let O=$();if(window.Anubis&&typeof window.Anubis.getState=="function"){let e=window.Anubis.getState();c(e),w("debug:init",{state:e})}else c({}),w("debug:init",{waitingFor:"consent:ready"});S("state"),m.addEventListener("click",()=>{a.classList.toggle("anubis-debug--collapsed"),m.textContent=a.classList.contains("anubis-debug--collapsed")?"Expand":"Collapse"}),q.addEventListener("click",()=>{g.length=0,p.length=0,f(s,g),f(l,p)}),window.AnubisDebugPanel={destroy(){v.forEach(e=>e()),b.push=D,O(),d.remove(),delete window.AnubisDebugPanel}}}if(document.body){x();return}document.addEventListener("DOMContentLoaded",x,{once:!0})})();})();
