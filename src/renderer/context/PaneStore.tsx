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
import type { LayoutMode, PaneSnapshot, SessionSnapshot } from '../../shared/ipc';
import { getApi } from '../lib/api';

interface PaneStoreApi {
  panes: PaneSnapshot[];
  order: string[];
  orderedPanes: PaneSnapshot[];
  count: number;
  soloId: string | null;
  layout: LayoutMode;
  setLayout: (layout: LayoutMode) => void;
  ready: boolean;
  isElectron: boolean;
  hasSavedSession: boolean;
  openFromText: (text: string) => Promise<{ added: number; invalid: Array<{ input: string; reason: string }>; duplicates: number }>;
  addFromText: (text: string) => Promise<{ added: number; invalid: Array<{ input: string; reason: string }>; duplicates: number }>;
  removePane: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  reorder: (order: string[]) => Promise<void>;
  movePane: (sourceId: string, targetId: string) => Promise<void>;
  setSolo: (id: string | null) => Promise<void>;
  continueSession: () => Promise<boolean>;
  dismissSavedSession: () => Promise<void>;
}

const PaneStoreContext = createContext<PaneStoreApi | null>(null);

const LAYOUT_KEY = 'multiview:layout';
const LAYOUTS: LayoutMode[] = ['auto', '1', '2', '3', '4', '2x2', '3x2', '3x3'];

function loadLayout(): LayoutMode {
  try {
    const value = localStorage.getItem(LAYOUT_KEY) as LayoutMode | null;
    return value && LAYOUTS.includes(value) ? value : 'auto';
  } catch {
    return 'auto';
  }
}

function saveLayout(layout: LayoutMode): void {
  try {
    localStorage.setItem(LAYOUT_KEY, layout);
  } catch {
    /* ignore */
  }
}

export function PaneStoreProvider({ children }: { children: ReactNode }) {
  const [panes, setPanes] = useState<PaneSnapshot[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [soloId, setSoloId] = useState<string | null>(null);
  const [layout, setLayoutState] = useState<LayoutMode>(() => loadLayout());
  const [ready, setReady] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const [hasSavedSession, setHasSavedSession] = useState(false);

  const panesRef = useRef(panes);
  panesRef.current = panes;
  const orderRef = useRef(order);
  orderRef.current = order;
  const soloRef = useRef(soloId);
  soloRef.current = soloId;
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  // Subscribe to main-process state and hydrate any saved session metadata.
  useEffect(() => {
    const api = getApi();
    if (!api) {
      setReady(true);
      setIsElectron(false);
      return;
    }

    setIsElectron(true);

    let cancelled = false;
    const unsubs = [
      api.onPanesChanged((payload) => {
        if (cancelled) return;
        setPanes(payload.panes);
        setOrder(payload.order);
        setSoloId(payload.soloId);
      }),
      api.onPaneUpdated((pane) => {
        if (cancelled) return;
        setPanes((current) => current.map((entry) => (entry.id === pane.id ? pane : entry)));
      }),
    ];

    void (async () => {
      const state = await api.getState();
      if (cancelled) return;
      setPanes(state.panes);
      setOrder(state.order);
      setSoloId(state.soloId);

      const saved = await api.loadSession();
      if (!cancelled) {
        setHasSavedSession(Boolean(saved && saved.panes.length > 0 && state.panes.length === 0));
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  // Persist the live session whenever it changes.
  useEffect(() => {
    if (!ready || !isElectron) return;
    const api = getApi();
    if (!api) return;

    const session: SessionSnapshot = {
      panes: panes.map((pane) => ({
        id: pane.id,
        originalUrl: pane.originalUrl,
        currentUrl: pane.currentUrl,
        muted: pane.muted,
        zoomFactor: pane.zoomFactor,
      })),
      order,
      layout,
      soloId,
    };

    const timer = window.setTimeout(() => {
      void api.saveSession(session);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [panes, order, layout, soloId, ready, isElectron]);

  useEffect(() => {
    saveLayout(layout);
  }, [layout]);

  const openFromText = useCallback(async (text: string) => {
    const api = getApi();
    if (!api) return { added: 0, invalid: [{ input: '', reason: 'Not running in Electron' }], duplicates: 0 };
    const result = await api.createPanes(text);
    return { added: result.panes.length, invalid: result.invalid, duplicates: 0 };
  }, []);

  const addFromText = useCallback(async (text: string) => {
    const api = getApi();
    if (!api) return { added: 0, invalid: [], duplicates: 0 };
    const result = await api.addPanes(text);
    const lines = text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean).length;
    const duplicates = Math.max(0, lines - result.panes.length - result.invalid.length);
    return { added: result.panes.length, invalid: result.invalid, duplicates };
  }, []);

  const removePane = useCallback(async (id: string) => {
    await getApi()?.removePane(id);
  }, []);

  const clearAll = useCallback(async () => {
    const api = getApi();
    if (!api) return;
    await api.clearPanes();
    await api.clearSession();
    setHasSavedSession(false);
  }, []);

  const reorder = useCallback(async (next: string[]) => {
    await getApi()?.reorder(next);
  }, []);

  const movePane = useCallback(async (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const current = [...orderRef.current];
    const from = current.indexOf(sourceId);
    const to = current.indexOf(targetId);
    if (from < 0 || to < 0) return;
    current.splice(from, 1);
    current.splice(to, 0, sourceId);
    await getApi()?.reorder(current);
  }, []);

  const setSolo = useCallback(async (id: string | null) => {
    await getApi()?.setSolo(id);
  }, []);

  const continueSession = useCallback(async () => {
    const api = getApi();
    if (!api) return false;
    const saved = await api.loadSession();
    if (!saved || saved.panes.length === 0) return false;
    await api.restoreSession(saved);
    if (saved.layout && LAYOUTS.includes(saved.layout)) setLayoutState(saved.layout);
    setHasSavedSession(false);
    return true;
  }, []);

  const dismissSavedSession = useCallback(async () => {
    await getApi()?.clearSession();
    setHasSavedSession(false);
  }, []);

  const setLayout = useCallback((next: LayoutMode) => setLayoutState(next), []);

  const orderedPanes = useMemo(() => {
    const byId = new Map(panes.map((pane) => [pane.id, pane]));
    const ordered = order
      .map((id) => byId.get(id))
      .filter((pane): pane is PaneSnapshot => pane !== undefined);
    if (ordered.length !== panes.length) {
      const seen = new Set(ordered.map((pane) => pane.id));
      return [...ordered, ...panes.filter((pane) => !seen.has(pane.id))];
    }
    return ordered;
  }, [panes, order]);

  const api = useMemo<PaneStoreApi>(
    () => ({
      panes,
      order,
      orderedPanes,
      count: panes.length,
      soloId,
      layout,
      setLayout,
      ready,
      isElectron,
      hasSavedSession,
      openFromText,
      addFromText,
      removePane,
      clearAll,
      reorder,
      movePane,
      setSolo,
      continueSession,
      dismissSavedSession,
    }),
    [
      panes,
      order,
      orderedPanes,
      soloId,
      layout,
      setLayout,
      ready,
      isElectron,
      hasSavedSession,
      openFromText,
      addFromText,
      removePane,
      clearAll,
      reorder,
      movePane,
      setSolo,
      continueSession,
      dismissSavedSession,
    ],
  );

  return <PaneStoreContext.Provider value={api}>{children}</PaneStoreContext.Provider>;
}

export function usePaneStore(): PaneStoreApi {
  const context = useContext(PaneStoreContext);
  if (!context) throw new Error('usePaneStore must be used inside <PaneStoreProvider>');
  return context;
}
