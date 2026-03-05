function parseJSON(value) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function readCookie(name) {
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

function writeCookie(name, value, maxAgeSeconds) {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax`;
}

export function readStoredConsent(options) {
  const key = options.storageKey;

  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(key);
    const parsed = raw ? parseJSON(raw) : null;
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  }

  const cookieRaw = readCookie(key);
  if (!cookieRaw) {
    return null;
  }

  const parsed = parseJSON(cookieRaw);
  return parsed && typeof parsed === 'object' ? parsed : null;
}

export function saveStoredConsent(payload, options) {
  const key = options.storageKey;
  const serialized = JSON.stringify(payload);

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, serialized);
  }

  writeCookie(key, serialized, options.cookieMaxAgeSeconds);
}

export function clearStoredConsent(options) {
  const key = options.storageKey;
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
  }
  writeCookie(key, '', 0);
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
