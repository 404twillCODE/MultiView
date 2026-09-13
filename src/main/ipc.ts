/**
 * IPC handlers — the only surface the React UI can call into.
 *
 * Every channel is registered once against a single PaneManager. Guest websites
 * never see these channels; only the MultiView preload exposes them.
 */

import { BrowserWindow, ipcMain } from 'electron';
import { IpcEvent, IpcInvoke, type BoundsUpdate, type SessionSnapshot } from '../shared/ipc';
import type { PaneManager } from './paneManager';
import { clearSession, loadSession, saveSession } from './sessionStore';

function broadcast(channel: string, payload: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, payload);
  }
}

export function registerIpc(manager: PaneManager): void {
  const pushState = () => {
    broadcast(IpcEvent.panesChanged, manager.getState());
  };

  manager.onChange(pushState);
  manager.onPaneUpdate((pane) => broadcast(IpcEvent.paneUpdated, pane));
  manager.onFullscreen((id, entered) => {
    broadcast(entered ? IpcEvent.fullscreenEntered : IpcEvent.fullscreenLeft, id);
  });
  manager.onPopup((id, url) => broadcast(IpcEvent.popupBlocked, { id, url }));

  ipcMain.removeHandler(IpcInvoke.isElectron);
  ipcMain.handle(IpcInvoke.isElectron, async () => true);

  ipcMain.removeHandler(IpcInvoke.createPanes);
  ipcMain.handle(IpcInvoke.createPanes, async (_event, text: string) =>
    manager.createFromText(String(text ?? ''), true),
  );

  ipcMain.removeHandler(IpcInvoke.addPanes);
  ipcMain.handle(IpcInvoke.addPanes, async (_event, text: string) =>
    manager.createFromText(String(text ?? ''), false),
  );

  ipcMain.removeHandler(IpcInvoke.removePane);
  ipcMain.handle(IpcInvoke.removePane, async (_event, id: string) => {
    manager.remove(String(id));
  });

  ipcMain.removeHandler(IpcInvoke.clearPanes);
  ipcMain.handle(IpcInvoke.clearPanes, async () => {
    manager.clear();
  });

  ipcMain.removeHandler(IpcInvoke.navigate);
  ipcMain.handle(IpcInvoke.navigate, async (_event, id: string, url: string) => {
    manager.navigate(String(id), String(url));
  });

  ipcMain.removeHandler(IpcInvoke.goBack);
  ipcMain.handle(IpcInvoke.goBack, async (_event, id: string) => {
    manager.goBack(String(id));
  });

  ipcMain.removeHandler(IpcInvoke.goForward);
  ipcMain.handle(IpcInvoke.goForward, async (_event, id: string) => {
    manager.goForward(String(id));
  });

  ipcMain.removeHandler(IpcInvoke.reload);
  ipcMain.handle(IpcInvoke.reload, async (_event, id: string) => {
    manager.reload(String(id));
  });

  ipcMain.removeHandler(IpcInvoke.stop);
  ipcMain.handle(IpcInvoke.stop, async (_event, id: string) => {
    manager.stop(String(id));
  });

  ipcMain.removeHandler(IpcInvoke.setMuted);
  ipcMain.handle(IpcInvoke.setMuted, async (_event, id: string, muted: boolean) => {
    manager.setMuted(String(id), Boolean(muted));
  });

  ipcMain.removeHandler(IpcInvoke.setMutedAll);
  ipcMain.handle(IpcInvoke.setMutedAll, async (_event, muted: boolean) => {
    manager.setMutedAll(Boolean(muted));
  });

  ipcMain.removeHandler(IpcInvoke.setSolo);
  ipcMain.handle(IpcInvoke.setSolo, async (_event, id: string | null) => {
    manager.setSolo(id ? String(id) : null);
  });

  ipcMain.removeHandler(IpcInvoke.setZoom);
  ipcMain.handle(IpcInvoke.setZoom, async (_event, id: string, factor: number) => {
    manager.setZoom(String(id), Number(factor));
  });

  ipcMain.removeHandler(IpcInvoke.setBounds);
  ipcMain.handle(IpcInvoke.setBounds, async (_event, updates: BoundsUpdate[]) => {
    if (Array.isArray(updates)) manager.setBoundsBatch(updates);
  });

  ipcMain.removeHandler(IpcInvoke.setVisible);
  ipcMain.handle(IpcInvoke.setVisible, async (_event, id: string, visible: boolean) => {
    manager.setVisible(String(id), Boolean(visible));
  });

  ipcMain.removeHandler(IpcInvoke.setVisibleMap);
  ipcMain.handle(IpcInvoke.setVisibleMap, async (_event, updates: BoundsUpdate[]) => {
    if (Array.isArray(updates)) manager.setBoundsBatch(updates);
  });

  ipcMain.removeHandler(IpcInvoke.openDevTools);
  ipcMain.handle(IpcInvoke.openDevTools, async (_event, id: string) => {
    manager.openDevTools(String(id));
  });

  ipcMain.removeHandler(IpcInvoke.openExternal);
  ipcMain.handle(IpcInvoke.openExternal, async (_event, url: string) => {
    await manager.openExternal(String(url));
  });

  ipcMain.removeHandler(IpcInvoke.returnHome);
  ipcMain.handle(IpcInvoke.returnHome, async (_event, id: string) => {
    manager.returnHome(String(id));
  });

  ipcMain.removeHandler(IpcInvoke.getState);
  ipcMain.handle(IpcInvoke.getState, async () => manager.getState());

  ipcMain.removeHandler(IpcInvoke.reorder);
  ipcMain.handle(IpcInvoke.reorder, async (_event, order: string[]) => {
    if (Array.isArray(order)) manager.reorder(order.map(String));
  });

  ipcMain.removeHandler(IpcInvoke.loadSession);
  ipcMain.handle(IpcInvoke.loadSession, async () => loadSession());

  ipcMain.removeHandler(IpcInvoke.saveSession);
  ipcMain.handle(IpcInvoke.saveSession, async (_event, session: SessionSnapshot) => {
    saveSession(session);
  });

  ipcMain.removeHandler(IpcInvoke.clearSession);
  ipcMain.handle(IpcInvoke.clearSession, async () => {
    clearSession();
  });

  ipcMain.removeHandler(IpcInvoke.restoreSession);
  ipcMain.handle(IpcInvoke.restoreSession, async (_event, session: SessionSnapshot) => {
    if (!session?.panes?.length) return;
    manager.restorePanes(session.panes);
    if (Array.isArray(session.order) && session.order.length > 0) {
      manager.reorder(session.order);
    }
    if (session.soloId) manager.setSolo(session.soloId);
  });
}

/**
 * Extra channel used by the renderer to tell the main process a modal is open
 * so guest views can be temporarily hidden underneath it.
 */
export function registerOverlayIpc(manager: PaneManager): void {
  ipcMain.removeHandler('mv:overlay');
  ipcMain.handle('mv:overlay', async (_event, open: boolean) => {
    if (open) manager.hideAll();
    else manager.restoreVisibility();
  });
}
