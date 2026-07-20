(()=>{(function(){if(typeof window>"u"||typeof document>"u"||window.AnubisDebugPanel)return;function _(a){try{return JSON.stringify(a,null,2)}catch{return String(a)}}let $=`
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
    `;function N(){return new Date().toLocaleTimeString()}function P(a){return a===null||typeof a>"u"?"":String(a).trim().toLowerCase()}function z(){let a=[typeof navigator<"u"?navigator.globalPrivacyControl:null,typeof window<"u"?window.globalPrivacyControl:null],u=a.find(s=>s!==null&&typeof s<"u"),l=a.some(s=>s===!0),d=[typeof navigator<"u"?navigator.doNotTrack:null,typeof window<"u"?window.doNotTrack:null,typeof navigator<"u"?navigator.msDoNotTrack:null],b=d.find(s=>s!==null&&typeof s<"u"),w=d.some(s=>{let y=P(s);return y==="1"||y==="yes"});return{gpc:{enabled:l,label:l?"enabled":"disabled",raw:typeof u>"u"?"":String(u)},dnt:{enabled:w,label:w?"enabled":"disabled",raw:typeof b>"u"?"":String(b)}}}function j(){let a=document.createElement("div");a.className="debug-host";let u=a.attachShadow({mode:"open"}),l=document.createElement("style");l.textContent=$,u.appendChild(l);let d=document.createElement("aside");return d.className="debug",d.setAttribute("aria-live","polite"),d.innerHTML=`
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
    `,u.appendChild(d),document.body.appendChild(a),{panel:d,host:a}}function M(){return Array.isArray(window.dataLayer)||(window.dataLayer=[]),window.dataLayer}function S(){let{panel:a,host:u}=j(),l=a.querySelector('[data-anubis-debug="tokens"]'),d=a.querySelector('[data-anubis-debug="consent-log"]'),b=a.querySelector('[data-anubis-debug="datalayer-log"]'),w=a.querySelector('[data-anubis-debug="state-wrap"]'),s=a.querySelector('[data-anubis-debug="toggle"]'),y=a.querySelector('[data-anubis-debug="clear"]'),D=a.querySelectorAll("[data-anubis-debug-tab]"),m=[],x=[],C=[];function h(e){let t=Object.entries(e||{}),n=z(),i=t.length?t.map(([r,c])=>{let f=c==="granted";return`<div class="debug-state-row"><span class="debug-state-key">${r}</span><span class="debug-token ${f?"debug-token--granted":"debug-token--denied"}">${f?"granted":"denied"}</span></div>`}).join(""):'<div class="debug-state-row"><span class="debug-state-key">No consent state yet</span></div>',o=[{key:"GPC",value:n.gpc},{key:"DNT",value:n.dnt}].map(r=>{let c=r.value.enabled?"debug-token--granted":"debug-token--denied",f=r.value.raw?` (${r.value.raw})`:"";return`<div class="debug-state-row"><span class="debug-state-key">${r.key}</span><span class="debug-token ${c}">${r.value.label}${f}</span></div>`}).join("");l.innerHTML=`${i}${o}`}function v(e,t){e.innerHTML=t.map(n=>`<article class="debug-log-item">
            <div><span class="debug-log-time">${n.time}</span> <span class="debug-log-name">${n.name}</span></div>
            <pre class="debug-log-data">${n.data}</pre>
          </article>`).join("")}function E(e,t,n,i,o){e.unshift({time:N(),name:i,data:_(o||{})}),e.length>t&&(e.length=t),v(n,e)}function k(e,t){E(m,80,d,e,t)}function g(e,t){E(x,120,b,e,t)}function A(e){let t=e==="state",n=e==="internal",i=e==="datalayer";D.forEach(o=>{o.setAttribute("aria-selected",o.getAttribute("data-anubis-debug-tab")===e?"true":"false")}),w.hidden=!t,d.hidden=!n,b.hidden=!i}function q(e){if(e&&e.state){h(e.state);return}window.Anubis&&typeof window.Anubis.getState=="function"&&h(window.Anubis.getState())}D.forEach(e=>{e.addEventListener("click",()=>{A(e.getAttribute("data-anubis-debug-tab"))})});function I(e){let t=n=>{k(e,n.detail),q(n.detail)};return document.addEventListener(e,t),()=>document.removeEventListener(e,t)}["consent:ready","consent:updated","consent:revoked","consent:script-blocked","consent:script-activated"].forEach(e=>{C.push(I(e))});let p=M(),T=p.push.bind(p);p.slice(-25).forEach((e,t)=>{g(`snapshot:${t+1}`,e)}),p.push=function(...t){let n=t[0],i=n&&typeof n=="object"&&n.event?String(n.event):"dataLayer.push",o=n&&typeof n=="object"&&(n.consentCommand||n.event)||"";return g(i,{command:o,args:t}),T(...t)};function G(){let e=null,t=null;function n(i){if(typeof window.gtag!="function")return!1;let o=window.gtag;if(o.__anubisDebugWrapped)return!0;let r=o,c=function(...L){return g("gtag()",{args:L}),r.apply(this,L)};return c.__anubisDebugWrapped=!0,c.__anubisDebugOriginal=r,window.gtag=c,g("gtag:hooked",{status:i}),!0}return n("wrapped-existing")||(g("gtag:hooked",{status:"not-found"}),e=window.setInterval(()=>{n("wrapped-late")&&(e&&(clearInterval(e),e=null),t&&(clearTimeout(t),t=null))},300),t=window.setTimeout(()=>{e&&(clearInterval(e),e=null)},1e4)),function(){e&&clearInterval(e),t&&clearTimeout(t);let o=window.gtag;typeof o=="function"&&o.__anubisDebugWrapped&&typeof o.__anubisDebugOriginal=="function"&&(window.gtag=o.__anubisDebugOriginal)}}let O=G();if(window.Anubis&&typeof window.Anubis.getState=="function"){let e=window.Anubis.getState();h(e),k("debug:init",{state:e})}else h({}),k("debug:init",{waitingFor:"consent:ready"});A("state"),s.addEventListener("click",()=>{a.classList.toggle("debug--collapsed"),s.textContent=a.classList.contains("debug--collapsed")?"Expand":"Collapse"}),y.addEventListener("click",()=>{m.length=0,x.length=0,v(d,m),v(b,x)}),window.AnubisDebugPanel={destroy(){C.forEach(e=>e()),p.push=T,O(),u.remove(),delete window.AnubisDebugPanel}}}if(document.body){S();return}document.addEventListener("DOMContentLoaded",S,{once:!0})})();})();
