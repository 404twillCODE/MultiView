import { useCallback, useMemo, useState } from 'react';
import type { PlayerControls } from '../types';

const DEFAULT_CONTROLS: PlayerControls = { muted: false, playbackRate: 1, reloadNonce: 0 };

export interface PlayerControlsApi {
  get: (id: string) => PlayerControls;
  toggleMuted: (id: string) => void;
  setMuted: (id: string, muted: boolean) => void;
  setMutedForAll: (ids: string[], muted: boolean) => void;
  setPlaybackRate: (id: string, rate: number) => void;
  reload: (id: string) => void;
  reloadAll: (ids: string[]) => void;
}

/**
 * Declarative control state for every player, keyed by video id.
 *
 * Players read their props and apply them through provider APIs, so a global
 * action such as "Mute all" is a state change rather than a remount.
 */
export function usePlayerControls(): PlayerControlsApi {
  const [state, setState] = useState<Record<string, PlayerControls>>({});

  const get = useCallback(
    (id: string): PlayerControls => state[id] ?? DEFAULT_CONTROLS,
    [state],
  );

  const patch = useCallback((id: string, changes: Partial<PlayerControls>) => {
    setState((current) => ({
      ...current,
      [id]: { ...(current[id] ?? DEFAULT_CONTROLS), ...changes },
    }));
  }, []);

  const toggleMuted = useCallback((id: string) => {
    setState((current) => {
      const existing = current[id] ?? DEFAULT_CONTROLS;
      return { ...current, [id]: { ...existing, muted: !existing.muted } };
    });
  }, []);

  const setMuted = useCallback((id: string, muted: boolean) => patch(id, { muted }), [patch]);

  const setMutedForAll = useCallback((ids: string[], muted: boolean) => {
    setState((current) => {
      const next = { ...current };
      for (const id of ids) next[id] = { ...(next[id] ?? DEFAULT_CONTROLS), muted };
      return next;
    });
  }, []);

  const setPlaybackRate = useCallback(
    (id: string, rate: number) => patch(id, { playbackRate: rate }),
    [patch],
  );

  const reload = useCallback((id: string) => {
    setState((current) => {
      const existing = current[id] ?? DEFAULT_CONTROLS;
      return { ...current, [id]: { ...existing, reloadNonce: existing.reloadNonce + 1 } };
    });
  }, []);

  const reloadAll = useCallback((ids: string[]) => {
    setState((current) => {
      const next = { ...current };
      for (const id of ids) {
        const existing = next[id] ?? DEFAULT_CONTROLS;
        next[id] = { ...existing, reloadNonce: existing.reloadNonce + 1 };
      }
      return next;
    });
  }, []);

  return useMemo(
    () => ({
      get,
      toggleMuted,
      setMuted,
      setMutedForAll,
      setPlaybackRate,
      reload,
      reloadAll,
    }),
    [get, toggleMuted, setMuted, setMutedForAll, setPlaybackRate, reload, reloadAll],
  );
}
