/**
 * Headless smoke test for the Electron PaneManager.
 *
 * Launch with:
 *   MV_SMOKE=1 npx electron-vite dev -- --smoke
 *
 * or after build:
 *   MV_SMOKE=1 electron out/main/index.js
 *
 * Opens a hidden window, creates several panes, exercises navigation / mute /
 * bounds / remove, and exits non-zero on failure.
 */

import { BrowserWindow } from 'electron';
import { PaneManager } from './paneManager';

interface Check {
  name: string;
  ok: boolean;
  detail?: string;
}

const checks: Check[] = [];

function check(name: string, ok: boolean, detail?: string): void {
  checks.push({ name, ok, detail });
  const mark = ok ? 'ok  ' : 'FAIL';
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runSmokeTest(): Promise<number> {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Minimal UI surface so contentView exists.
  await window.loadURL('data:text/html,<html><body style="background:#07090d"></body></html>');

  const manager = new PaneManager();
  manager.attach(window);

  const updates: string[] = [];
  manager.onPaneUpdate((pane) => {
    updates.push(`${pane.id}:${pane.loading ? 'loading' : 'idle'}:${pane.hostname}`);
  });

  // --- create panes -------------------------------------------------------
  const created = manager.createFromText(
    [
      'https://example.com',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://example.org',
      'not-a-url',
      'https://example.com', // duplicate
    ].join('\n'),
    true,
  );

  check('created 3 panes', created.panes.length === 3, `got ${created.panes.length}`);
  check('flagged invalid', created.invalid.length === 1, JSON.stringify(created.invalid));
  check('state count', manager.getState().panes.length === 3);

  // --- bounds -------------------------------------------------------------
  const ids = manager.getState().order;
  manager.setBoundsBatch(
    ids.map((id, index) => ({
      id,
      visible: true,
      bounds: { x: 20 + index * 400, y: 60, width: 380, height: 300 },
    })),
  );
  check('bounds applied without throw', true);

  // --- wait for loads -----------------------------------------------------
  await sleep(5000);

  const afterLoad = manager.getState().panes;
  check(
    'example.com loaded',
    afterLoad.some((pane) => pane.hostname.includes('example.com') && !pane.loading),
    afterLoad.map((pane) => `${pane.hostname}:${pane.loading}:${pane.error ?? '-'}`).join(' | '),
  );
  check(
    'youtube pane present',
    afterLoad.some((pane) => pane.hostname.includes('youtube')),
  );
  check('titles arrived', afterLoad.some((pane) => pane.title.length > 0), afterLoad.map((p) => p.title).join(' | '));

  // --- mute / solo --------------------------------------------------------
  const first = ids[0];
  manager.setMuted(first, true);
  check('pane muted flag', manager.getState().panes.find((pane) => pane.id === first)?.muted === true);
  manager.setSolo(ids[1]);
  check('solo set', manager.getState().soloId === ids[1]);
  manager.setSolo(null);
  manager.setMutedAll(true);
  check(
    'mute all',
    manager.getState().panes.every((pane) => pane.muted),
  );
  manager.setMutedAll(false);

  // --- navigation ---------------------------------------------------------
  manager.navigate(first, 'https://example.org');
  await sleep(2500);
  const navigated = manager.getState().panes.find((pane) => pane.id === first);
  check(
    'navigate updated url',
    Boolean(navigated && navigated.currentUrl.includes('example.org')),
    navigated?.currentUrl,
  );
  manager.returnHome(first);
  await sleep(2000);
  const home = manager.getState().panes.find((pane) => pane.id === first);
  check(
    'return home',
    Boolean(home && home.currentUrl.includes('example.com')),
    home?.currentUrl,
  );

  // --- zoom / reload ------------------------------------------------------
  manager.setZoom(first, 1.25);
  check(
    'zoom factor',
    manager.getState().panes.find((pane) => pane.id === first)?.zoomFactor === 1.25,
  );
  manager.reload(first);
  await sleep(1500);
  check('reload did not crash', true);

  // --- remove / clear -----------------------------------------------------
  manager.remove(ids[2]);
  check('remove pane', manager.getState().panes.length === 2);
  manager.clear();
  check('clear all', manager.getState().panes.length === 0);

  // --- popup handler smoke (create one more, ensure no crash) -------------
  manager.createFromText('https://example.com', true);
  await sleep(1000);
  check('recreate after clear', manager.getState().panes.length === 1);

  manager.dispose();
  window.destroy();

  const failed = checks.filter((entry) => !entry.ok);
  console.log(
    failed.length === 0
      ? `\nSmoke test passed (${checks.length} checks).`
      : `\n${failed.length} check(s) failed.`,
  );
  return failed.length === 0 ? 0 : 1;
}

/** True when the process was started in smoke-test mode. */
export function shouldRunSmoke(): boolean {
  return process.env.MV_SMOKE === '1' || process.argv.includes('--smoke');
}
