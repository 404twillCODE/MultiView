/**
 * Shared IPC contract.
 *
 * Everything that crosses the renderer ↔ main boundary is typed here so both
 * sides stay in lockstep. Guest websites never see these channels — only the
 * MultiView UI preload exposes them through `contextBridge`.
 */

/** Pixel bounds of a pane's content area, in window DIP coordinates. */
export interface PaneBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Snapshot of one browser pane, safe to send over IPC. */
export interface PaneSnapshot {
  id: string;
  /** URL the user originally opened this pane with. */
  originalUrl: string;
  currentUrl: string;
  title: string;
  hostname: string;
  muted: boolean;
  zoomFactor: number;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  /** Last load failure message, if any. */
  error: string | null;
}

export type LayoutMode =
  | 'auto'
  | '1'
  | '2'
  | '3'
  | '4'
  | '2x2'
  | '3x2'
  | '3x3';

export interface SessionSnapshot {
  panes: Array<{ id: string; originalUrl: string; currentUrl: string; muted: boolean; zoomFactor: number }>;
  order: string[];
  layout: LayoutMode;
  soloId: string | null;
}

/** Renderer → main invoke channels. */
export const IpcInvoke = {
  createPanes: 'mv:create-panes',
  addPanes: 'mv:add-panes',
  removePane: 'mv:remove-pane',
  clearPanes: 'mv:clear-panes',
  navigate: 'mv:navigate',
  goBack: 'mv:go-back',
  goForward: 'mv:go-forward',
  reload: 'mv:reload',
  stop: 'mv:stop',
  setMuted: 'mv:set-muted',
  setMutedAll: 'mv:set-muted-all',
  setSolo: 'mv:set-solo',
  setZoom: 'mv:set-zoom',
  setBounds: 'mv:set-bounds',
  setVisible: 'mv:set-visible',
  setVisibleMap: 'mv:set-visible-map',
  openDevTools: 'mv:open-devtools',
  openExternal: 'mv:open-external',
  returnHome: 'mv:return-home',
  getState: 'mv:get-state',
  reorder: 'mv:reorder',
  loadSession: 'mv:load-session',
  saveSession: 'mv:save-session',
  clearSession: 'mv:clear-session',
  restoreSession: 'mv:restore-session',
  isElectron: 'mv:is-electron',
} as const;

export type IpcInvokeChannel = (typeof IpcInvoke)[keyof typeof IpcInvoke];

/** Main → renderer push events. */
export const IpcEvent = {
  panesChanged: 'mv:panes-changed',
  paneUpdated: 'mv:pane-updated',
  fullscreenEntered: 'mv:fullscreen-entered',
  fullscreenLeft: 'mv:fullscreen-left',
  popupBlocked: 'mv:popup-blocked',
} as const;

export type IpcEventChannel = (typeof IpcEvent)[keyof typeof IpcEvent];

export interface CreatePanesResult {
  panes: PaneSnapshot[];
  invalid: Array<{ input: string; reason: string }>;
}

export interface BoundsUpdate {
  id: string;
  bounds: PaneBounds | null;
  visible: boolean;
}

/** API exposed to the React renderer through the preload bridge. */
export interface MultiViewApi {
  isElectron: () => Promise<boolean>;
  createPanes: (text: string) => Promise<CreatePanesResult>;
  addPanes: (text: string) => Promise<CreatePanesResult>;
  removePane: (id: string) => Promise<void>;
  clearPanes: () => Promise<void>;
  navigate: (id: string, url: string) => Promise<void>;
  goBack: (id: string) => Promise<void>;
  goForward: (id: string) => Promise<void>;
  reload: (id: string) => Promise<void>;
  stop: (id: string) => Promise<void>;
  setMuted: (id: string, muted: boolean) => Promise<void>;
  setMutedAll: (muted: boolean) => Promise<void>;
  setSolo: (id: string | null) => Promise<void>;
  setZoom: (id: string, factor: number) => Promise<void>;
  setBoundsBatch: (updates: BoundsUpdate[]) => Promise<void>;
  setVisible: (id: string, visible: boolean) => Promise<void>;
  openDevTools: (id: string) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  returnHome: (id: string) => Promise<void>;
  getState: () => Promise<{ panes: PaneSnapshot[]; order: string[]; soloId: string | null }>;
  reorder: (order: string[]) => Promise<void>;
  loadSession: () => Promise<SessionSnapshot | null>;
  saveSession: (session: SessionSnapshot) => Promise<void>;
  clearSession: () => Promise<void>;
  restoreSession: (session: SessionSnapshot) => Promise<void>;
  onPanesChanged: (handler: (payload: { panes: PaneSnapshot[]; order: string[]; soloId: string | null }) => void) => () => void;
  onPaneUpdated: (handler: (pane: PaneSnapshot) => void) => () => void;
  onFullscreenEntered: (handler: (id: string) => void) => () => void;
  onFullscreenLeft: (handler: (id: string) => void) => () => void;
  onPopupBlocked: (handler: (payload: { id: string; url: string }) => void) => () => void;
}
