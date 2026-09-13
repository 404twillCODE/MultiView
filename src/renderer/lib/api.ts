/**
 * Typed access to the MultiView preload bridge.
 *
 * Outside Electron (e.g. opening the renderer in a regular browser) this returns
 * null so the UI can show a clear "desktop app required" message.
 */

import type { MultiViewApi } from '../../shared/ipc';

declare global {
  interface Window {
    multiview?: MultiViewApi;
    multiviewOverlay?: { setOpen: (open: boolean) => Promise<void> };
  }
}

export function getApi(): MultiViewApi | null {
  return typeof window !== 'undefined' && window.multiview ? window.multiview : null;
}

export function requireApi(): MultiViewApi {
  const api = getApi();
  if (!api) {
    throw new Error('MultiView requires the Electron shell. Run `npm run electron:dev`.');
  }
  return api;
}

export async function setOverlayOpen(open: boolean): Promise<void> {
  try {
    await window.multiviewOverlay?.setOpen(open);
  } catch {
    /* not in Electron */
  }
}
