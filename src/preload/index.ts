/**
 * Preload — the only place Electron APIs are exposed to the React UI.
 *
 * Guest websites loaded in WebContentsViews do NOT get this preload. They run
 * fully sandboxed with no bridge at all.
 */

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import {
  IpcEvent,
  IpcInvoke,
  type BoundsUpdate,
  type CreatePanesResult,
  type MultiViewApi,
  type PaneSnapshot,
  type SessionSnapshot,
} from '../shared/ipc';

function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  return ipcRenderer.invoke(channel, ...args) as Promise<T>;
}

function subscribe<T>(channel: string, handler: (payload: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, payload: T) => handler(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api: MultiViewApi = {
  isElectron: () => invoke(IpcInvoke.isElectron),
  createPanes: (text) => invoke<CreatePanesResult>(IpcInvoke.createPanes, text),
  addPanes: (text) => invoke<CreatePanesResult>(IpcInvoke.addPanes, text),
  removePane: (id) => invoke(IpcInvoke.removePane, id),
  clearPanes: () => invoke(IpcInvoke.clearPanes),
  navigate: (id, url) => invoke(IpcInvoke.navigate, id, url),
  goBack: (id) => invoke(IpcInvoke.goBack, id),
  goForward: (id) => invoke(IpcInvoke.goForward, id),
  reload: (id) => invoke(IpcInvoke.reload, id),
  stop: (id) => invoke(IpcInvoke.stop, id),
  setMuted: (id, muted) => invoke(IpcInvoke.setMuted, id, muted),
  setMutedAll: (muted) => invoke(IpcInvoke.setMutedAll, muted),
  setSolo: (id) => invoke(IpcInvoke.setSolo, id),
  setZoom: (id, factor) => invoke(IpcInvoke.setZoom, id, factor),
  setBoundsBatch: (updates: BoundsUpdate[]) => invoke(IpcInvoke.setBounds, updates),
  setVisible: (id, visible) => invoke(IpcInvoke.setVisible, id, visible),
  openDevTools: (id) => invoke(IpcInvoke.openDevTools, id),
  openExternal: (url) => invoke(IpcInvoke.openExternal, url),
  returnHome: (id) => invoke(IpcInvoke.returnHome, id),
  getState: () => invoke(IpcInvoke.getState),
  reorder: (order) => invoke(IpcInvoke.reorder, order),
  loadSession: () => invoke(IpcInvoke.loadSession),
  saveSession: (session: SessionSnapshot) => invoke(IpcInvoke.saveSession, session),
  clearSession: () => invoke(IpcInvoke.clearSession),
  restoreSession: (session: SessionSnapshot) => invoke(IpcInvoke.restoreSession, session),
  onPanesChanged: (handler) => subscribe(IpcEvent.panesChanged, handler),
  onPaneUpdated: (handler) => subscribe<PaneSnapshot>(IpcEvent.paneUpdated, handler),
  onFullscreenEntered: (handler) => subscribe<string>(IpcEvent.fullscreenEntered, handler),
  onFullscreenLeft: (handler) => subscribe<string>(IpcEvent.fullscreenLeft, handler),
  onPopupBlocked: (handler) => subscribe(IpcEvent.popupBlocked, handler),
};

contextBridge.exposeInMainWorld('multiview', api);

// Overlay helper: hide guest views while a modal covers the UI.
contextBridge.exposeInMainWorld('multiviewOverlay', {
  setOpen: (open: boolean) => ipcRenderer.invoke('mv:overlay', open),
});
