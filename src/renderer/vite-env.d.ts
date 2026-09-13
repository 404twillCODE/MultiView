/// <reference types="vite/client" />

import type { MultiViewApi } from '../../shared/ipc';

declare global {
  interface Window {
    multiview?: MultiViewApi;
    multiviewOverlay?: { setOpen: (open: boolean) => Promise<void> };
  }
}

export {};
