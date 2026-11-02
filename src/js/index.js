import { initAnubis } from './runtime.js';

let bootPromise;

export function startAnubis(options) {
  if (bootPromise) {
    return bootPromise;
  }
  const resolvedOptions = options || (typeof window !== 'undefined' ? window.ConsentOptions || {} : {});
  const exposeApi = (api) => {
    if (typeof window !== 'undefined') {
      window.Anubis = api;
    }
  };
  bootPromise = initAnubis(resolvedOptions, { onApi: exposeApi });
  return bootPromise;
}

export default startAnubis;

// Autostart one microtask later so an ESM importer's explicit `startAnubis(options)`
// call wins. Microtasks drain before the HTML parser continues, so the IIFE still
// signals consent defaults before the next script in the page.
if (typeof window !== 'undefined') {
  queueMicrotask(() => {
    const shouldAutostart = !window.ConsentOptions || window.ConsentOptions.autoStart !== false;
    if (shouldAutostart && !bootPromise) {
      startAnubis(window.ConsentOptions || {}).catch((error) => {
        console.error('[Anubis] Failed to initialize', error);
      });
    }
  });
}
