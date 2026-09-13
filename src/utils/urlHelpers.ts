/**
 * Low level URL helpers. Nothing in here knows about video providers — that
 * lives in `videoParser.ts`.
 */

const HAS_PROTOCOL = /^[a-z][a-z\d+\-.]*:\/\//i;

/** Hostnames we accept: `example.com`, `sub.example.co.uk`, IPv4, `localhost`. */
const VALID_HOSTNAME =
  /^(localhost|(\d{1,3}\.){3}\d{1,3}|([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,})$/i;

/** Params that only exist for analytics; dropped so duplicates match. */
const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'igshid',
  'si',
  'feature',
  'app',
  'ref',
  'ref_src',
  'ref_url',
  'source',
  'pp',
]);

/** Adds `https://` when the user pasted a bare host such as `youtu.be/abc`. */
function ensureProtocol(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  if (value.startsWith('//')) return `https:${value}`;
  if (HAS_PROTOCOL.test(value)) return value;
  return `https://${value}`;
}

/** Parses to a `URL`, restricted to http(s). Returns `null` on anything else. */
export function toUrl(raw: string): URL | null {
  const candidate = ensureProtocol(raw);
  if (!candidate) return null;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  return url;
}

/**
 * True when a string is plausibly a web address. Deliberately strict enough to
 * reject the classic garbage inputs (`youtube`, `hello`, `not-a-url`).
 */
export function isProbablyUrl(raw: string): boolean {
  const url = toUrl(raw);
  return url !== null && VALID_HOSTNAME.test(url.hostname);
}

/** `https://www.YouTube.com/watch?v=x` → `youtube.com` */
export function getHostname(raw: string): string {
  const url = toUrl(raw);
  if (!url) return '';
  return url.hostname.toLowerCase().replace(/^www\./, '');
}

/**
 * Canonical, comparable form of a URL: https, no `www.`, no hash, no tracking
 * params, sorted query, no trailing slash. Used for duplicate detection.
 */
export function normalizeUrl(raw: string): string {
  const url = toUrl(raw);
  if (!url) return raw.trim().toLowerCase();

  url.protocol = 'https:';
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  url.hash = '';
  url.username = '';
  url.password = '';
  if (url.port === '80' || url.port === '443') url.port = '';

  for (const key of Array.from(url.searchParams.keys())) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key);
  }
  url.searchParams.sort();

  const path = url.pathname.replace(/\/+$/, '');
  return `${url.protocol}//${url.host}${path}${url.search}`;
}

/**
 * Splits a textarea value into candidate URLs. Primarily one per line, but also
 * tolerates several links on one line and stray wrapping characters, because
 * that is what real pasted text looks like.
 */
export function splitUrlList(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map((token) => token.replace(/^[<("'[]+/, '').replace(/[>)"'\]]+$/, '').trim())
    .filter((token) => token.length > 0);
}

/** Parses `1h2m10s`, `90s` or `90` into seconds. */
export function parseTimeToSeconds(value: string | null): number {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value);
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!match) return 0;
  const [, h, m, s] = match;
  return Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
}
