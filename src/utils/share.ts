/**
 * Shareable sessions.
 *
 * The whole wall is encoded into the hash query so a link can rebuild it without
 * any server: `/#/watch?s=<base64url>`. Plain `?v=<url>&v=<url>` links are also
 * accepted because they are easier to hand-write. localStorage remains the
 * primary store — URLs have length limits, share links are a convenience.
 */

const MAX_SAFE_URL_LENGTH = 2000;

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): string | null {
  try {
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export interface ShareLink {
  url: string;
  /** True when the link exceeds what browsers reliably handle. */
  tooLong: boolean;
}

export function buildShareLink(urls: string[]): ShareLink {
  const { origin, pathname } = window.location;
  const encoded = toBase64Url(urls.join('\n'));
  const url = `${origin}${pathname}#/watch?s=${encoded}`;
  return { url, tooLong: url.length > MAX_SAFE_URL_LENGTH };
}

/** Reads video URLs out of a `?s=` or repeated `?v=` query string. */
export function readSharedUrls(search: string): string[] {
  const params = new URLSearchParams(search);

  const packed = params.get('s');
  if (packed) {
    const decoded = fromBase64Url(packed);
    if (decoded) {
      return decoded
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    }
  }

  return params
    .getAll('v')
    .map((value) => value.trim())
    .filter(Boolean);
}

/** Clipboard write with a legacy fallback for non-secure contexts. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the textarea fallback
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/** Clipboard read, used by the "Paste from Clipboard" button. */
export async function readClipboard(): Promise<string | null> {
  try {
    if (!navigator.clipboard || !('readText' in navigator.clipboard)) return null;
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}
