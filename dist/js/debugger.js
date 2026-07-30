(()=>{(function(){if(typeof window>"u"||typeof document>"u"||window.AnubisDebugPanel)return;let b="[Anubis Debug]";function P(){let a=window.AnubisDebugOptions&&typeof window.AnubisDebugOptions=="object"?window.AnubisDebugOptions:{};return{mode:(typeof a.mode=="string"?a.mode.trim().toLowerCase():"")==="console"?"console":"panel"}}function M(a){try{return JSON.stringify(a,null,2)}catch{return String(a)}}let j=`
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
    `;function q(){return new Date().toLocaleTimeString()}function z(a){return a===null||typeof a>"u"?"":String(a).trim().toLowerCase()}function N(){let a=[typeof navigator<"u"?navigator.globalPrivacyControl:null,typeof window<"u"?window.globalPrivacyControl:null],i=a.find(u=>u!==null&&typeof u<"u"),l=a.some(u=>u===!0),n=[typeof navigator<"u"?navigator.doNotTrack:null,typeof window<"u"?window.doNotTrack:null,typeof navigator<"u"?navigator.msDoNotTrack:null],p=n.find(u=>u!==null&&typeof u<"u"),f=n.some(u=>{let g=z(u);return g==="1"||g==="yes"});return{gpc:{enabled:l,label:l?"enabled":"disabled",raw:typeof i>"u"?"":String(i)},dnt:{enabled:f,label:f?"enabled":"disabled",raw:typeof p>"u"?"":String(p)}}}function I(){let a=document.createElement("div");a.className="debug-host";let i=a.attachShadow({mode:"open"}),l=document.createElement("style");l.textContent=j,i.appendChild(l);let n=document.createElement("aside");return n.className="debug",n.setAttribute("aria-live","polite"),n.innerHTML=`
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
    `,i.appendChild(n),document.body.appendChild(a),{panel:n,host:a}}function G(){return Array.isArray(window.dataLayer)||(window.dataLayer=[]),window.dataLayer}function A(){let i=P().mode==="console",l=i?null:I(),n=l?l.panel:null,p=l?l.host:null,f=n?n.querySelector('[data-anubis-debug="tokens"]'):null,u=n?n.querySelector('[data-anubis-debug="consent-log"]'):null,g=n?n.querySelector('[data-anubis-debug="datalayer-log"]'):null,R=n?n.querySelector('[data-anubis-debug="state-wrap"]'):null,x=n?n.querySelector('[data-anubis-debug="toggle"]'):null,C=n?n.querySelector('[data-anubis-debug="clear"]'):null,E=n?n.querySelectorAll("[data-anubis-debug-tab]"):[],v=[],k=[],$=[];function w(e){let t=Object.entries(e||{}),o=N(),s=t.length?t.map(([r,c])=>{let m=c==="granted";return`<div class="debug-state-row"><span class="debug-state-key">${r}</span><span class="debug-token ${m?"debug-token--granted":"debug-token--denied"}">${m?"granted":"denied"}</span></div>`}).join(""):'<div class="debug-state-row"><span class="debug-state-key">No consent state yet</span></div>',d=[{key:"GPC",value:o.gpc},{key:"DNT",value:o.dnt}].map(r=>{let c=r.value.enabled?"debug-token--granted":"debug-token--denied",m=r.value.raw?` (${r.value.raw})`:"";return`<div class="debug-state-row"><span class="debug-state-key">${r.key}</span><span class="debug-token ${c}">${r.value.label}${m}</span></div>`}).join("");return f&&(f.innerHTML=`${s}${d}`),{consent:e||{},signals:{gpc:o.gpc,dnt:o.dnt}}}function L(e,t){e&&(e.innerHTML=t.map(o=>`<article class="debug-log-item">
            <div><span class="debug-log-time">${o.time}</span> <span class="debug-log-name">${o.name}</span></div>
            <pre class="debug-log-data">${o.data}</pre>
          </article>`).join(""))}function T(e,t,o,s,d){let r=q();e.unshift({time:r,name:s,data:M(d||{})}),e.length>t&&(e.length=t),L(o,e),i&&console.log(`${b} ${r} ${s}`,d||{})}function S(e,t){T(v,80,u,e,t)}function y(e,t){T(k,120,g,e,t)}function _(e){if(!n)return;let t=e==="state",o=e==="internal",s=e==="datalayer";E.forEach(d=>{d.setAttribute("aria-selected",d.getAttribute("data-anubis-debug-tab")===e?"true":"false")}),R.hidden=!t,u.hidden=!o,g.hidden=!s}function B(e){return e&&e.state?w(e.state):window.Anubis&&typeof window.Anubis.getState=="function"?w(window.Anubis.getState()):w({})}n&&E.forEach(e=>{e.addEventListener("click",()=>{_(e.getAttribute("data-anubis-debug-tab"))})});function F(e){let t=o=>{S(e,o.detail);let s=B(o.detail);i&&s&&console.log(`${b} state`,s)};return document.addEventListener(e,t),()=>document.removeEventListener(e,t)}["consent:ready","consent:updated","consent:revoked","consent:script-blocked","consent:script-activated"].forEach(e=>{$.push(F(e))});let h=G(),O=h.push.bind(h);h.slice(-25).forEach((e,t)=>{y(`snapshot:${t+1}`,e)}),h.push=function(...t){let o=t[0],s=o&&typeof o=="object"&&o.event?String(o.event):"dataLayer.push",d=o&&typeof o=="object"&&(o.consentCommand||o.event)||"";return y(s,{command:d,args:t}),O(...t)};function W(){let e=null,t=null;function o(s){if(typeof window.gtag!="function")return!1;let d=window.gtag;if(d.__anubisDebugWrapped)return!0;let r=d,c=function(...D){return y("gtag()",{args:D}),r.apply(this,D)};return c.__anubisDebugWrapped=!0,c.__anubisDebugOriginal=r,window.gtag=c,y("gtag:hooked",{status:s}),!0}return o("wrapped-existing")||(y("gtag:hooked",{status:"not-found"}),e=window.setInterval(()=>{o("wrapped-late")&&(e&&(clearInterval(e),e=null),t&&(clearTimeout(t),t=null))},300),t=window.setTimeout(()=>{e&&(clearInterval(e),e=null)},1e4)),function(){e&&clearInterval(e),t&&clearTimeout(t);let d=window.gtag;typeof d=="function"&&d.__anubisDebugWrapped&&typeof d.__anubisDebugOriginal=="function"&&(window.gtag=d.__anubisDebugOriginal)}}let H=W();if(window.Anubis&&typeof window.Anubis.getState=="function"){let e=window.Anubis.getState(),t=w(e);S("debug:init",{state:e}),i&&(console.log(`${b} mode`,{mode:"console"}),console.log(`${b} state`,t))}else{let e=w({});S("debug:init",{waitingFor:"consent:ready"}),i&&(console.log(`${b} mode`,{mode:"console"}),console.log(`${b} state`,e))}_("state"),x&&x.addEventListener("click",()=>{n.classList.toggle("debug--collapsed"),x.textContent=n.classList.contains("debug--collapsed")?"Expand":"Collapse"}),C&&C.addEventListener("click",()=>{v.length=0,k.length=0,L(u,v),L(g,k)}),window.AnubisDebugPanel={destroy(){$.forEach(e=>e()),h.push=O,H(),p&&p.remove(),delete window.AnubisDebugPanel}}}if(document.body){A();return}document.addEventListener("DOMContentLoaded",A,{once:!0})})();})();
