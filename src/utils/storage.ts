/**
 * Thin, failure-tolerant wrapper around localStorage.
 *
 * Private browsing modes and disabled storage throw on access, so every call is
 * guarded: MultiView degrades to an in-memory session rather than crashing.
 */

import type { LayoutMode, Session, VideoSource } from '../types';
import { parseVideoUrl } from './videoParser';

const PREFIX = 'multiview:v1:';

export const StorageKeys = {
  session: `${PREFIX}session`,
  draft: `${PREFIX}draft`,
  layout: `${PREFIX}layout`,
} as const;

function safeLocalStorage(): Storage | null {
  try {
    const storage = window.localStorage;
    const probe = `${PREFIX}probe`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

const store = typeof window === 'undefined' ? null : safeLocalStorage();

export const storageAvailable = store !== null;

function read<T>(key: string): T | null {
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled — the app stays usable in memory.
  }
}

function remove(key: string): void {
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ Session */

function isVideoLike(value: unknown): value is VideoSource {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<VideoSource>;
  return typeof candidate.id === 'string' && typeof candidate.originalUrl === 'string';
}

/**
 * Loads the saved wall. Every entry is re-parsed from its original URL so embeds
 * always match the current host (Twitch/YouTube embeds encode the parent origin)
 * and so improvements to the parser apply to old sessions.
 */
export function loadSession(): Session {
  const raw = read<Partial<Session>>(StorageKeys.session);
  if (!raw || !Array.isArray(raw.videos)) return { videos: [], order: [] };

  const videos: VideoSource[] = [];
  for (const entry of raw.videos) {
    if (!isVideoLike(entry)) continue;
    const parsed = parseVideoUrl(entry.originalUrl);
    if (!parsed.ok) continue;
    videos.push({ ...parsed.video, id: entry.id });
  }

  const ids = new Set(videos.map((video) => video.id));
  const savedOrder = Array.isArray(raw.order) ? raw.order.filter((id) => ids.has(id)) : [];
  const order = [
    ...savedOrder,
    ...videos.map((video) => video.id).filter((id) => !savedOrder.includes(id)),
  ];

  return { videos, order };
}

export function saveSession(session: Session): void {
  if (session.videos.length === 0) {
    remove(StorageKeys.session);
    return;
  }
  write(StorageKeys.session, session);
}

export function clearSession(): void {
  remove(StorageKeys.session);
}

/* -------------------------------------------------------------------- Draft */

/** The last text typed into the landing page textarea. */
export function loadDraft(): string {
  const draft = read<string>(StorageKeys.draft);
  return typeof draft === 'string' ? draft : '';
}

export function saveDraft(text: string): void {
  if (!text.trim()) {
    remove(StorageKeys.draft);
    return;
  }
  write(StorageKeys.draft, text);
}

/* ------------------------------------------------------------------- Layout */

const LAYOUTS: LayoutMode[] = ['auto', '1', '2', '3', '4'];

export function loadLayout(): LayoutMode {
  const layout = read<LayoutMode>(StorageKeys.layout);
  return layout && LAYOUTS.includes(layout) ? layout : 'auto';
}

export function saveLayout(layout: LayoutMode): void {
  write(StorageKeys.layout, layout);
}
