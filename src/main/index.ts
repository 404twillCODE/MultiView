/**
 * Electron main process entry.
 *
 * Owns the BrowserWindow and a single PaneManager for guest WebContentsViews.
 * The React UI talks to that manager exclusively through the typed IPC bridge.
 */

import { app, BrowserWindow } from 'electron';
import { registerIpc, registerOverlayIpc } from './ipc';
import { PaneManager } from './paneManager';
import { runSmokeTest, shouldRunSmoke } from './smoke';
import { createMainWindow } from './window';

const manager = new PaneManager();

async function create(): Promise<void> {
  const window = createMainWindow();
  manager.attach(window);
  registerIpc(manager);
  registerOverlayIpc(manager);

  window.on('closed', () => {
    manager.dispose();
  });
}

app.whenReady().then(async () => {
  if (shouldRunSmoke()) {
    const code = await runSmokeTest();
    app.exit(code);
    return;
  }

  await create();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void create();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  manager.dispose();
});
