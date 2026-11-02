export function parseJSON(value) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function getLocalStorageArea() {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch (_error) {
    return null;
  }
  return null;
}

function readLocalStorageValue(key) {
  const storage = getLocalStorageArea();
  if (!storage) {
    return null;
  }
  return storage.getItem(key);
}

function writeLocalStorageValue(key, value) {
  const storage = getLocalStorageArea();
  if (!storage) {
    return;
  }
  storage.setItem(key, value);
}

function removeLocalStorageValue(key) {
  const storage = getLocalStorageArea();
  if (!storage) {
    return;
  }
  storage.removeItem(key);
}

export function readCookie(name) {
  if (typeof document === 'undefined') {
    return '';
  }
  const target = `${encodeURIComponent(name)}=`;
  const parts = document.cookie ? document.cookie.split('; ') : [];
  for (let index = 0; index < parts.length; index += 1) {
    if (parts[index].indexOf(target) === 0) {
      return decodeURIComponent(parts[index].slice(target.length));
    }
  }
  return '';
}

let warnedCookieDomain = false;

// `domain` (e.g. `.example.com`) shares the cookie across subdomains. Any host-only
// copy is expired first so it cannot shadow the shared one. If the browser rejects the
// domain (staging/preview hosts that are not under it), fall back to a host-only cookie
// so the choice is still remembered on this host.
export function writeCookie(name, value, maxAgeSeconds, domain = '') {
  if (typeof document === 'undefined') {
    return;
  }
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  const encodedName = encodeURIComponent(name);
  const hostOnly = (cookieValue, maxAge) => {
    document.cookie = `${encodedName}=${encodeURIComponent(cookieValue)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
  };

  if (!domain) {
    hostOnly(value, maxAgeSeconds);
    return;
  }

  hostOnly('', 0);
  document.cookie = `${encodedName}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax; Domain=${domain}${secure}`;

  if (value && maxAgeSeconds > 0 && readCookie(name) !== value) {
    hostOnly(value, maxAgeSeconds);
    if (!warnedCookieDomain && typeof console !== 'undefined' && console.warn) {
      warnedCookieDomain = true;
      console.warn(`[Anubis] cookieDomain "${domain}" was rejected on ${location.hostname}; using a host-only cookie.`);
    }
  }
}

export function clearMirroredObject(key, domain = '') {
  removeLocalStorageValue(key);
  writeCookie(key, '', 0, domain);
}

export function writeMirroredObject(key, payload, maxAgeSeconds, domain = '') {
  const serialized = JSON.stringify(payload);
  try {
    writeLocalStorageValue(key, serialized);
  } catch (_error) {
  }
  writeCookie(key, serialized, maxAgeSeconds, domain);
}

export function readMirroredObject(key, validator, domain = '') {
  const validate = typeof validator === 'function'
    ? validator
    : () => ({ valid: true, expired: false });

  const evaluate = (raw) => {
    const parsed = raw ? parseJSON(raw) : null;
    const result = validate(parsed);
    const valid = result && result.valid === true;
    const expired = result && result.expired === true;
    return {
      parsed,
      valid,
      expired,
    };
  };

  // localStorage is per-origin, so with a shared cookie domain the cookie is the only
  // source of truth; a local copy may be stale from another subdomain's change.
  const localRaw = domain ? null : readLocalStorageValue(key);
  if (localRaw) {
    const localResult = evaluate(localRaw);
    if (localResult.valid) {
      return localResult.parsed;
    }
    removeLocalStorageValue(key);
    if (localResult.expired) {
      writeCookie(key, '', 0, domain);
      return null;
    }
  }

  const cookieRaw = readCookie(key);
  if (cookieRaw) {
    const cookieResult = evaluate(cookieRaw);
    if (cookieResult.valid) {
      return cookieResult.parsed;
    }
    writeCookie(key, '', 0, domain);
    if (cookieResult.expired) {
      return null;
    }
  }

  return null;
}

export function readStoredConsent(options) {
  const key = options.storageKey;
  return readMirroredObject(key, (parsed) => {
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, expired: false };
    }
    const expiresAt = Number(parsed.expiresAt);
    if (Number.isFinite(expiresAt) && Date.now() > expiresAt) {
      return { valid: false, expired: true };
    }
    return { valid: true, expired: false };
  }, options.cookieDomain);
}

export function saveStoredConsent(payload, options) {
  const key = options.storageKey;
  const now = Number(payload && payload.updatedAt) > 0 ? Number(payload.updatedAt) : Date.now();
  const ttlSeconds = Math.max(1, Number(options.cookieMaxAgeSeconds) || 1);
  const entry = {
    ...(payload && typeof payload === 'object' ? payload : {}),
    updatedAt: now,
    expiresAt: now + (ttlSeconds * 1000),
  };

  writeMirroredObject(key, entry, ttlSeconds, options.cookieDomain);
}

export function clearStoredConsent(options) {
  const key = options.storageKey;
  clearMirroredObject(key, options.cookieDomain);
}

export function clearClientCookies(shouldClear = () => true) {
  if (typeof document === 'undefined' || typeof location === 'undefined') {
    return;
  }

  const names = (document.cookie || '')
    .split(';')
    .map((part) => part.split('=')[0].trim())
    .filter(Boolean)
    .filter((name) => shouldClear(name));

  const host = location.hostname || '';
  const hostParts = host.split('.').filter(Boolean);
  const domains = [''];
  for (let index = 0; index < hostParts.length; index += 1) {
    domains.push(`.${hostParts.slice(index).join('.')}`);
    domains.push(hostParts.slice(index).join('.'));
  }

  const uniqueDomains = Array.from(new Set(domains));

  names.forEach((name) => {
    uniqueDomains.forEach((domain) => {
      const domainPart = domain ? `; domain=${domain}` : '';
      document.cookie = `${name}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/${domainPart}`;
      document.cookie = `${name}=; Max-Age=0; Path=/${domainPart}`;
    });
  });
}
