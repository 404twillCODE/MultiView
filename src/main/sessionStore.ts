/**
 * Persistent session storage for the main process.
 *
 * Lives next to the Electron userData directory so sessions survive across
 * launches without depending on the renderer being alive.
 */

import { app } from 'electron';
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import type { SessionSnapshot } from '../shared/ipc';

function sessionPath(): string {
  const dir = join(app.getPath('userData'), 'state');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, 'session.json');
}

export function loadSession(): SessionSnapshot | null {
  try {
    const raw = readFileSync(sessionPath(), 'utf8');
    const parsed = JSON.parse(raw) as SessionSnapshot;
    if (!parsed || !Array.isArray(parsed.panes)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: SessionSnapshot): void {
  try {
    if (session.panes.length === 0) {
      clearSession();
      return;
    }
    writeFileSync(sessionPath(), JSON.stringify(session, null, 2), 'utf8');
  } catch {
    /* disk full / permissions — ignore, the app still works in memory */
  }
}

export function clearSession(): void {
  try {
    unlinkSync(sessionPath());
  } catch {
    /* already gone */
  }
}
