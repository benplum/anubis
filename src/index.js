import { initAnubis } from './runtime.js';

let bootPromise;

export function startAnubis(options) {
  if (bootPromise) {
    return bootPromise;
  }
  const resolvedOptions = options || (typeof window !== 'undefined' ? window.AnubisOptions || {} : {});
  bootPromise = initAnubis(resolvedOptions).then((api) => {
    if (typeof window !== 'undefined') {
      window.Anubis = api;
    }
    return api;
  });
  return bootPromise;
}

export default startAnubis;

if (typeof window !== 'undefined') {
  const shouldAutostart = !window.AnubisOptions || window.AnubisOptions.autoStart !== false;
  if (shouldAutostart) {
    startAnubis(window.AnubisOptions || {}).catch((error) => {
      console.error('[Anubis] Failed to initialize', error);
    });
  }
}
