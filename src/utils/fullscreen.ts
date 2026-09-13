/** Cross-browser fullscreen helpers (Safari still needs the webkit names). */

interface WebkitElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

interface WebkitDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

export function fullscreenElement(): Element | null {
  const doc = document as WebkitDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function isFullscreenSupported(): boolean {
  const element = document.documentElement as WebkitElement;
  return typeof element.requestFullscreen === 'function' || typeof element.webkitRequestFullscreen === 'function';
}

export async function requestFullscreen(element: HTMLElement | null): Promise<void> {
  if (!element) return;
  const target = element as WebkitElement;
  try {
    if (typeof target.requestFullscreen === 'function') {
      await target.requestFullscreen();
    } else if (typeof target.webkitRequestFullscreen === 'function') {
      await target.webkitRequestFullscreen();
    }
  } catch {
    // Denied by the browser (e.g. no user gesture) — nothing to recover from.
  }
}

export async function exitFullscreen(): Promise<void> {
  const doc = document as WebkitDocument;
  try {
    if (typeof doc.exitFullscreen === 'function') {
      await doc.exitFullscreen();
    } else if (typeof doc.webkitExitFullscreen === 'function') {
      await doc.webkitExitFullscreen();
    }
  } catch {
    /* ignore */
  }
}

/** Subscribes to fullscreen changes; returns an unsubscribe function. */
export function onFullscreenChange(listener: () => void): () => void {
  document.addEventListener('fullscreenchange', listener);
  document.addEventListener('webkitfullscreenchange', listener);
  return () => {
    document.removeEventListener('fullscreenchange', listener);
    document.removeEventListener('webkitfullscreenchange', listener);
  };
}
