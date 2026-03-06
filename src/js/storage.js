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

export function writeCookie(name, value, maxAgeSeconds) {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax`;
}

export function clearMirroredObject(key) {
  removeLocalStorageValue(key);
  writeCookie(key, '', 0);
}

export function writeMirroredObject(key, payload, maxAgeSeconds) {
  const serialized = JSON.stringify(payload);
  try {
    writeLocalStorageValue(key, serialized);
  } catch (_error) {
  }
  writeCookie(key, serialized, maxAgeSeconds);
}

export function readMirroredObject(key, validator) {
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

  const localRaw = readLocalStorageValue(key);
  if (localRaw) {
    const localResult = evaluate(localRaw);
    if (localResult.valid) {
      return localResult.parsed;
    }
    removeLocalStorageValue(key);
    if (localResult.expired) {
      writeCookie(key, '', 0);
      return null;
    }
  }

  const cookieRaw = readCookie(key);
  if (cookieRaw) {
    const cookieResult = evaluate(cookieRaw);
    if (cookieResult.valid) {
      return cookieResult.parsed;
    }
    writeCookie(key, '', 0);
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
  });
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

  writeMirroredObject(key, entry, ttlSeconds);
}

export function clearStoredConsent(options) {
  const key = options.storageKey;
  clearMirroredObject(key);
}

export function clearClientCookies() {
  if (typeof document === 'undefined' || typeof location === 'undefined') {
    return;
  }

  const names = (document.cookie || '')
    .split(';')
    .map((part) => part.split('=')[0].trim())
    .filter(Boolean);

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
