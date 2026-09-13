import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { LayoutMode, Session, VideoSource } from '../types';
import { createId } from '../utils/id';
import { loadLayout, loadSession, saveLayout, saveSession } from '../utils/storage';
import { parseVideoList } from '../utils/videoParser';

export interface AddResult {
  added: VideoSource[];
  /** URLs skipped because an identical video is already open. */
  duplicates: number;
  invalid: { input: string; reason: string }[];
}

interface VideoStoreApi {
  /** Insertion order — used as the DOM order so reordering never remounts. */
  videos: VideoSource[];
  /** Display order, driven by drag & drop. */
  orderedVideos: VideoSource[];
  order: string[];
  count: number;
  /** Merges new URLs into the current wall. */
  addFromText: (text: string) => AddResult;
  /** Replaces the wall with the given URLs (used by the landing page). */
  openFromText: (text: string) => AddResult;
  removeVideo: (id: string) => void;
  clearAll: () => void;
  /** Moves `sourceId` to the slot of `targetId` in the display order. */
  moveVideo: (sourceId: string, targetId: string) => void;
  layout: LayoutMode;
  setLayout: (layout: LayoutMode) => void;
}

const VideoStoreContext = createContext<VideoStoreApi | null>(null);

export function VideoStoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(() => loadSession());
  const [layout, setLayout] = useState<LayoutMode>(() => loadLayout());

  /**
   * Mirror of `session` so mutations can be computed synchronously and callers
   * (the add-videos forms) can act on the result immediately.
   */
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const commit = useCallback((next: Session) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  useEffect(() => {
    saveSession(session);
  }, [session]);

  useEffect(() => {
    saveLayout(layout);
  }, [layout]);

  /** Parses text, skips duplicates, and appends what is left. */
  const insert = useCallback(
    (text: string, replace: boolean): AddResult => {
      const { videos: parsed, invalid } = parseVideoList(text);
      const base: Session = replace ? { videos: [], order: [] } : sessionRef.current;
      const existingKeys = new Set(base.videos.map((video) => video.key));

      const added: VideoSource[] = [];
      let duplicates = 0;

      for (const candidate of parsed) {
        if (existingKeys.has(candidate.key)) {
          duplicates += 1;
          continue;
        }
        existingKeys.add(candidate.key);
        added.push({ ...candidate, id: createId() });
      }

      if (added.length > 0) {
        commit({
          videos: [...base.videos, ...added],
          order: [...base.order, ...added.map((video) => video.id)],
        });
      }

      return { added, duplicates, invalid };
    },
    [commit],
  );

  const addFromText = useCallback((text: string) => insert(text, false), [insert]);
  const openFromText = useCallback((text: string) => insert(text, true), [insert]);

  const removeVideo = useCallback(
    (id: string) => {
      const current = sessionRef.current;
      commit({
        videos: current.videos.filter((video) => video.id !== id),
        order: current.order.filter((videoId) => videoId !== id),
      });
    },
    [commit],
  );

  const clearAll = useCallback(() => commit({ videos: [], order: [] }), [commit]);

  const moveVideo = useCallback(
    (sourceId: string, targetId: string) => {
      if (sourceId === targetId) return;
      const current = sessionRef.current;
      const order = [...current.order];
      const from = order.indexOf(sourceId);
      const to = order.indexOf(targetId);
      if (from === -1 || to === -1) return;
      order.splice(from, 1);
      order.splice(to, 0, sourceId);
      commit({ ...current, order });
    },
    [commit],
  );

  const orderedVideos = useMemo(() => {
    const byId = new Map(session.videos.map((video) => [video.id, video]));
    const ordered = session.order
      .map((id) => byId.get(id))
      .filter((video): video is VideoSource => video !== undefined);
    // Defensive: never lose a video because the order array drifted.
    if (ordered.length !== session.videos.length) {
      const seen = new Set(ordered.map((video) => video.id));
      return [...ordered, ...session.videos.filter((video) => !seen.has(video.id))];
    }
    return ordered;
  }, [session]);

  const api = useMemo<VideoStoreApi>(
    () => ({
      videos: session.videos,
      orderedVideos,
      order: session.order,
      count: session.videos.length,
      addFromText,
      openFromText,
      removeVideo,
      clearAll,
      moveVideo,
      layout,
      setLayout,
    }),
    [
      session.videos,
      session.order,
      orderedVideos,
      addFromText,
      openFromText,
      removeVideo,
      clearAll,
      moveVideo,
      layout,
    ],
  );

  return <VideoStoreContext.Provider value={api}>{children}</VideoStoreContext.Provider>;
}

export function useVideoStore(): VideoStoreApi {
  const context = useContext(VideoStoreContext);
  if (!context) throw new Error('useVideoStore must be used inside <VideoStoreProvider>');
  return context;
}
