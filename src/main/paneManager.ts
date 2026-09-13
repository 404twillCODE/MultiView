/**
 * PaneManager — owns every guest WebContentsView.
 *
 * React never touches Chromium directly. It asks for panes through IPC; this
 * class creates, lays out, navigates and destroys the native views, and pushes
 * state back when anything changes.
 */

import { BrowserWindow, WebContentsView, shell, type WebContents } from 'electron';
import type { BoundsUpdate, CreatePanesResult, PaneBounds, PaneSnapshot } from '../shared/ipc';
import { parseUrlList, getHostname, toUrl, normalizeUrl } from '../shared/urls';

interface Pane {
  id: string;
  originalUrl: string;
  view: WebContentsView;
  muted: boolean;
  zoomFactor: number;
  loading: boolean;
  error: string | null;
  /** Last known bounds — used to re-apply after a focus/unfocus cycle. */
  bounds: PaneBounds | null;
  visible: boolean;
}

let counter = 0;

function createId(): string {
  counter += 1;
  return `pane_${Date.now().toString(36)}_${counter.toString(36)}`;
}

function snapshotOf(pane: Pane): PaneSnapshot {
  const wc = pane.view.webContents;
  let currentUrl = pane.originalUrl;
  try {
    currentUrl = wc.getURL() || pane.originalUrl;
  } catch {
    /* destroyed */
  }
  let title = '';
  try {
    title = wc.getTitle();
  } catch {
    /* destroyed */
  }
  return {
    id: pane.id,
    originalUrl: pane.originalUrl,
    currentUrl,
    title,
    hostname: getHostname(currentUrl) || getHostname(pane.originalUrl),
    muted: pane.muted,
    zoomFactor: pane.zoomFactor,
    loading: pane.loading,
    canGoBack: (() => {
      try {
        const history = (wc as WebContents & {
          navigationHistory?: { canGoBack: () => boolean };
          canGoBack?: () => boolean;
        }).navigationHistory;
        if (history) return history.canGoBack();
        return typeof wc.canGoBack === 'function' ? wc.canGoBack() : false;
      } catch {
        return false;
      }
    })(),
    canGoForward: (() => {
      try {
        const history = (wc as WebContents & {
          navigationHistory?: { canGoForward: () => boolean };
          canGoForward?: () => boolean;
        }).navigationHistory;
        if (history) return history.canGoForward();
        return typeof wc.canGoForward === 'function' ? wc.canGoForward() : false;
      } catch {
        return false;
      }
    })(),
    error: pane.error,
  };
}

export class PaneManager {
  private panes = new Map<string, Pane>();
  private order: string[] = [];
  private soloId: string | null = null;
  private window: BrowserWindow | null = null;
  private emitChange: (() => void) | null = null;
  private emitPane: ((pane: PaneSnapshot) => void) | null = null;
  private emitFullscreen: ((id: string, entered: boolean) => void) | null = null;
  private emitPopup: ((id: string, url: string) => void) | null = null;

  attach(window: BrowserWindow): void {
    this.window = window;
  }

  onChange(handler: () => void): void {
    this.emitChange = handler;
  }

  onPaneUpdate(handler: (pane: PaneSnapshot) => void): void {
    this.emitPane = handler;
  }

  onFullscreen(handler: (id: string, entered: boolean) => void): void {
    this.emitFullscreen = handler;
  }

  onPopup(handler: (id: string, url: string) => void): void {
    this.emitPopup = handler;
  }

  getState(): { panes: PaneSnapshot[]; order: string[]; soloId: string | null } {
    return {
      panes: this.order
        .map((id) => this.panes.get(id))
        .filter((pane): pane is Pane => pane !== undefined)
        .map(snapshotOf),
      order: [...this.order],
      soloId: this.soloId,
    };
  }

  /* ---------------------------------------------------------------- create */

  createFromText(text: string, replace: boolean): CreatePanesResult {
    const { urls, invalid } = parseUrlList(text);
    if (replace) this.clear();

    const existingKeys = new Set(
      [...this.panes.values()].map((pane) => normalizeUrl(pane.originalUrl)),
    );
    const created: PaneSnapshot[] = [];

    for (const parsed of urls) {
      if (existingKeys.has(parsed.key)) continue;
      existingKeys.add(parsed.key);
      const pane = this.createPane(parsed.href, parsed.original);
      created.push(snapshotOf(pane));
    }

    this.notifyChange();
    return { panes: created, invalid };
  }

  private createPane(href: string, original: string): Pane {
    if (!this.window) throw new Error('PaneManager has no window attached');

    const view = new WebContentsView({
      webPreferences: {
        // Guest websites must never see Node or our preload.
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        // Partition keeps guest storage separate from the MultiView UI session.
        partition: 'persist:panes',
        spellcheck: true,
      },
    });

    const id = createId();
    const pane: Pane = {
      id,
      originalUrl: original,
      view,
      muted: false,
      zoomFactor: 1,
      loading: true,
      error: null,
      bounds: null,
      visible: false,
    };

    this.wireEvents(pane);
    this.window.contentView.addChildView(view);
    // Park off-screen until React reports real bounds.
    view.setBounds({ x: -10000, y: -10000, width: 1, height: 1 });
    view.setVisible(false);

    this.panes.set(id, pane);
    this.order.push(id);

    void view.webContents.loadURL(href).catch(() => {
      // did-fail-load will surface the error to the UI.
    });

    return pane;
  }

  /* ------------------------------------------------------------- lifecycle */

  private wireEvents(pane: Pane): void {
    const wc = pane.view.webContents;

    const push = () => this.emitPane?.(snapshotOf(pane));

    wc.on('did-start-loading', () => {
      pane.loading = true;
      pane.error = null;
      push();
    });

    wc.on('did-stop-loading', () => {
      pane.loading = false;
      push();
    });

    wc.on('did-navigate', () => push());
    wc.on('did-navigate-in-page', () => push());
    wc.on('page-title-updated', () => push());
    wc.on('did-finish-load', () => push());

    wc.on('did-fail-load', (_event, code, description, validatedURL, isMainFrame) => {
      if (!isMainFrame) return;
      // -3 is ERR_ABORTED (common during redirects / navigations we initiate).
      if (code === -3) return;
      pane.loading = false;
      pane.error = `${description || 'Load failed'}${validatedURL ? ` (${validatedURL})` : ''}`;
      push();
    });

    wc.on('enter-html-full-screen', () => this.emitFullscreen?.(pane.id, true));
    wc.on('leave-html-full-screen', () => this.emitFullscreen?.(pane.id, false));

    // Popups: never spawn uncontrolled windows. Same-host navigations stay in
    // the pane; everything else is offered to the user as an external open.
    wc.setWindowOpenHandler(({ url }) => {
      const current = toUrl(wc.getURL());
      const target = toUrl(url);
      if (current && target && current.hostname === target.hostname) {
        void wc.loadURL(url);
        return { action: 'deny' };
      }
      this.emitPopup?.(pane.id, url);
      return { action: 'deny' };
    });

    // Deny permission prompts that would escalate beyond what a normal browser
    // tab asks for by default (no camera/mic auto-grant, etc.).
    wc.session.setPermissionRequestHandler((_webContents, permission, callback) => {
      const allowed = permission === 'fullscreen' || permission === 'pointerLock';
      callback(allowed);
    });
  }

  /* ---------------------------------------------------------------- remove */

  remove(id: string): void {
    const pane = this.panes.get(id);
    if (!pane) return;

    try {
      this.window?.contentView.removeChildView(pane.view);
    } catch {
      /* already detached */
    }
    try {
      pane.view.webContents.close();
    } catch {
      /* already closed */
    }

    this.panes.delete(id);
    this.order = this.order.filter((entry) => entry !== id);
    if (this.soloId === id) this.soloId = null;
    this.notifyChange();
  }

  clear(): void {
    for (const id of [...this.panes.keys()]) this.remove(id);
    this.order = [];
    this.soloId = null;
    this.notifyChange();
  }

  /* ------------------------------------------------------------- navigation */

  navigate(id: string, url: string): void {
    const pane = this.panes.get(id);
    if (!pane) return;
    const parsed = toUrl(url);
    if (!parsed) return;
    pane.error = null;
    void pane.view.webContents.loadURL(parsed.toString());
  }

  goBack(id: string): void {
    const pane = this.panes.get(id);
    if (!pane) return;
    const wc = pane.view.webContents as WebContents & {
      navigationHistory?: { canGoBack: () => boolean; goBack: () => void };
      canGoBack?: () => boolean;
      goBack?: () => void;
    };
    try {
      if (wc.navigationHistory?.canGoBack()) {
        wc.navigationHistory.goBack();
      } else if (wc.canGoBack?.()) {
        wc.goBack?.();
      }
    } catch {
      /* destroyed */
    }
  }

  goForward(id: string): void {
    const pane = this.panes.get(id);
    if (!pane) return;
    const wc = pane.view.webContents as WebContents & {
      navigationHistory?: { canGoForward: () => boolean; goForward: () => void };
      canGoForward?: () => boolean;
      goForward?: () => void;
    };
    try {
      if (wc.navigationHistory?.canGoForward()) {
        wc.navigationHistory.goForward();
      } else if (wc.canGoForward?.()) {
        wc.goForward?.();
      }
    } catch {
      /* destroyed */
    }
  }

  reload(id: string): void {
    const pane = this.panes.get(id);
    if (!pane) return;
    pane.view.webContents.reload();
  }

  stop(id: string): void {
    const pane = this.panes.get(id);
    if (!pane) return;
    pane.view.webContents.stop();
  }

  returnHome(id: string): void {
    const pane = this.panes.get(id);
    if (!pane) return;
    void pane.view.webContents.loadURL(toUrl(pane.originalUrl)?.toString() ?? pane.originalUrl);
  }

  /* ------------------------------------------------------------------ audio */

  setMuted(id: string, muted: boolean): void {
    const pane = this.panes.get(id);
    if (!pane) return;
    pane.muted = muted;
    // Solo overrides individual mute for non-solo panes.
    this.applyAudio();
    this.emitPane?.(snapshotOf(pane));
  }

  setMutedAll(muted: boolean): void {
    for (const pane of this.panes.values()) {
      pane.muted = muted;
    }
    if (muted) this.soloId = null;
    this.applyAudio();
    this.notifyChange();
  }

  setSolo(id: string | null): void {
    if (id && !this.panes.has(id)) return;
    this.soloId = id;
    this.applyAudio();
    this.notifyChange();
  }

  private applyAudio(): void {
    for (const pane of this.panes.values()) {
      const muted = this.soloId ? pane.id !== this.soloId || pane.muted : pane.muted;
      try {
        pane.view.webContents.setAudioMuted(muted);
      } catch {
        /* destroyed */
      }
    }
  }

  /* ------------------------------------------------------------------- zoom */

  setZoom(id: string, factor: number): void {
    const pane = this.panes.get(id);
    if (!pane) return;
    const clamped = Math.min(3, Math.max(0.5, Math.round(factor * 100) / 100));
    pane.zoomFactor = clamped;
    try {
      pane.view.webContents.setZoomFactor(clamped);
    } catch {
      /* destroyed */
    }
    this.emitPane?.(snapshotOf(pane));
  }

  /* ---------------------------------------------------------------- layout */

  setBoundsBatch(updates: BoundsUpdate[]): void {
    for (const update of updates) {
      const pane = this.panes.get(update.id);
      if (!pane) continue;
      pane.visible = update.visible;
      pane.bounds = update.bounds;
      try {
        if (!update.visible || !update.bounds || update.bounds.width < 2 || update.bounds.height < 2) {
          pane.view.setVisible(false);
          pane.view.setBounds({ x: -10000, y: -10000, width: 1, height: 1 });
        } else {
          // Electron setBounds uses DIP, which match CSS pixels — no DPR multiply.
          pane.view.setBounds({
            x: Math.round(update.bounds.x),
            y: Math.round(update.bounds.y),
            width: Math.round(update.bounds.width),
            height: Math.round(update.bounds.height),
          });
          pane.view.setVisible(true);
        }
      } catch {
        /* destroyed */
      }
    }
  }

  setVisible(id: string, visible: boolean): void {
    const pane = this.panes.get(id);
    if (!pane) return;
    pane.visible = visible;
    try {
      pane.view.setVisible(visible);
    } catch {
      /* destroyed */
    }
  }

  /* ----------------------------------------------------------------- extras */

  openDevTools(id: string): void {
    const pane = this.panes.get(id);
    if (!pane) return;
    pane.view.webContents.openDevTools({ mode: 'detach' });
  }

  async openExternal(url: string): Promise<void> {
    const parsed = toUrl(url);
    if (!parsed) return;
    await shell.openExternal(parsed.toString());
  }

  reorder(order: string[]): void {
    const known = new Set(this.order);
    const next = order.filter((id) => known.has(id));
    for (const id of this.order) {
      if (!next.includes(id)) next.push(id);
    }
    this.order = next;
    this.notifyChange();
  }

  /* -------------------------------------------------------------- restore */

  restorePanes(
    entries: Array<{ id?: string; originalUrl: string; currentUrl?: string; muted?: boolean; zoomFactor?: number }>,
  ): void {
    this.clear();
    for (const entry of entries) {
      const href = toUrl(entry.currentUrl || entry.originalUrl)?.toString();
      if (!href) continue;
      const pane = this.createPane(href, entry.originalUrl);
      if (entry.muted) {
        pane.muted = true;
      }
      if (typeof entry.zoomFactor === 'number' && entry.zoomFactor !== 1) {
        pane.zoomFactor = entry.zoomFactor;
        try {
          pane.view.webContents.setZoomFactor(entry.zoomFactor);
        } catch {
          /* ignore */
        }
      }
    }
    this.applyAudio();
    this.notifyChange();
  }

  /* ---------------------------------------------------------------- helpers */

  private notifyChange(): void {
    this.emitChange?.();
  }

  /** Hide every guest view — used while a modal covers the window. */
  hideAll(): void {
    for (const pane of this.panes.values()) {
      try {
        pane.view.setVisible(false);
      } catch {
        /* ignore */
      }
    }
  }

  /** Re-show every view that React last marked visible. */
  restoreVisibility(): void {
    for (const pane of this.panes.values()) {
      try {
        pane.view.setVisible(pane.visible);
      } catch {
        /* ignore */
      }
    }
  }

  /** Tear everything down when the window closes. */
  dispose(): void {
    this.clear();
    this.window = null;
  }
}
