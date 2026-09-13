/**
 * Shared URL helpers used by both the Electron main process (when creating
 * panes) and the React renderer (live link counting on the landing page).
 */

const HAS_PROTOCOL = /^[a-z][a-z\d+\-.]*:\/\//i;

const VALID_HOSTNAME =
  /^(localhost|(\d{1,3}\.){3}\d{1,3}|([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,})$/i;

export function ensureProtocol(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  if (value.startsWith('//')) return `https:${value}`;
  if (HAS_PROTOCOL.test(value)) return value;
  return `https://${value}`;
}

export function toUrl(raw: string): URL | null {
  const candidate = ensureProtocol(raw);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url;
  } catch {
    return null;
  }
}

export function isProbablyUrl(raw: string): boolean {
  const url = toUrl(raw);
  return url !== null && VALID_HOSTNAME.test(url.hostname);
}

export function getHostname(raw: string): string {
  const url = toUrl(raw);
  if (!url) return '';
  return url.hostname.toLowerCase().replace(/^www\./, '');
}

export function normalizeUrl(raw: string): string {
  const url = toUrl(raw);
  if (!url) return raw.trim().toLowerCase();
  url.protocol = 'https:';
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  url.hash = '';
  url.username = '';
  url.password = '';
  if (url.port === '80' || url.port === '443') url.port = '';
  const path = url.pathname.replace(/\/+$/, '');
  return `${url.protocol}//${url.host}${path}${url.search}`;
}

/**
 * Splits a textarea value into candidate URLs. Primarily one per line, but also
 * tolerates several links on one line and wrapping characters.
 */
export function splitUrlList(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map((token) => token.replace(/^[<("'[]+/, '').replace(/[>)"'\]]+$/, '').trim())
    .filter((token) => token.length > 0);
}

export interface ParsedUrl {
  original: string;
  href: string;
  hostname: string;
  key: string;
}

export type ParseResult =
  | { ok: true; url: ParsedUrl }
  | { ok: false; input: string; reason: string };

export function parseUrlLine(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, input, reason: 'Empty line' };
  if (!isProbablyUrl(trimmed)) {
    return { ok: false, input: trimmed, reason: "Doesn't look like a URL" };
  }
  const url = toUrl(trimmed)!;
  return {
    ok: true,
    url: {
      original: trimmed,
      href: url.toString(),
      hostname: getHostname(trimmed),
      key: normalizeUrl(trimmed),
    },
  };
}

export function parseUrlList(text: string): {
  urls: ParsedUrl[];
  invalid: Array<{ input: string; reason: string }>;
} {
  const urls: ParsedUrl[] = [];
  const invalid: Array<{ input: string; reason: string }> = [];
  const seen = new Set<string>();

  for (const candidate of splitUrlList(text)) {
    const parsed = parseUrlLine(candidate);
    if (!parsed.ok) {
      invalid.push({ input: parsed.input, reason: parsed.reason });
      continue;
    }
    if (seen.has(parsed.url.key)) continue;
    seen.add(parsed.url.key);
    urls.push(parsed.url);
  }

  return { urls, invalid };
}
