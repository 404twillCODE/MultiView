import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AddPanesModal } from '../components/Viewer/AddPanesModal';
import { EmptyState } from '../components/Viewer/EmptyState';
import { PaneGrid } from '../components/Viewer/PaneGrid';
import { Toolbar } from '../components/Viewer/Toolbar';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { usePaneStore } from '../context/PaneStore';
import { useToast } from '../context/ToastContext';
import { useHotkeys } from '../hooks/useHotkeys';
import { usePaneBounds, type PaneSlot } from '../hooks/usePaneBounds';
import { getApi, setOverlayOpen } from '../lib/api';
import './ViewerPage.css';

/** MultiView mode — a wall of independent Electron browser panes. */
export function ViewerPage() {
  const {
    panes,
    order,
    count,
    layout,
    setLayout,
    soloId,
    setSolo,
    removePane,
    clearAll,
    movePane,
  } = usePaneStore();
  const { toast } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const contentEls = useRef(new Map<string, HTMLElement>());
  const [, bump] = useState(0);

  const suspended = addOpen || confirmClearOpen;

  // Hide native views under modals so they don't eat clicks / show through.
  useEffect(() => {
    void setOverlayOpen(suspended);
    return () => {
      void setOverlayOpen(false);
    };
  }, [suspended]);

  // HTML fullscreen inside a pane → enter MultiView focus mode for that pane.
  useEffect(() => {
    const api = getApi();
    if (!api) return;
    const offEnter = api.onFullscreenEntered((id) => setFocusedId(id));
    const offLeave = api.onFullscreenLeft(() => setFocusedId(null));
    const offPopup = api.onPopupBlocked(({ url }) => {
      void api.openExternal(url);
      toast('Opened popup in your system browser', 'info');
    });
    return () => {
      offEnter();
      offLeave();
      offPopup();
    };
  }, [toast]);

  const onContentRef = useCallback((id: string, element: HTMLElement | null) => {
    if (element) contentEls.current.set(id, element);
    else contentEls.current.delete(id);
    bump((value) => value + 1);
  }, []);

  const slots: PaneSlot[] = useMemo(
    () =>
      panes.map((pane) => ({
        id: pane.id,
        element: contentEls.current.get(pane.id) ?? null,
        // All panes stay visible in focus mode (thumbnails); only modals hide them.
        visible: true,
      })),
    // bump is intentional: remeasure after refs attach.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [panes, focusedId, suspended, bump],
  );

  usePaneBounds(slots, suspended);

  const allMuted = count > 0 && panes.every((pane) => pane.muted);

  const handleRemove = useCallback(
    async (id: string) => {
      await removePane(id);
      setFocusedId((current) => (current === id ? null : current));
      toast('Pane removed', 'info');
    },
    [removePane, toast],
  );

  const handleToggleFocus = useCallback((id: string) => {
    setFocusedId((current) => (current === id ? null : id));
  }, []);

  const handleToggleSolo = useCallback(
    async (id: string) => {
      await setSolo(soloId === id ? null : id);
      toast(soloId === id ? 'Solo audio cleared' : 'Solo audio on this pane', 'info');
    },
    [setSolo, soloId, toast],
  );

  const handleDragStart = useCallback((id: string) => setDraggingId(id), []);
  const handleDragEnter = useCallback((id: string) => setDropTargetId(id), []);
  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropTargetId(null);
  }, []);
  const handleDrop = useCallback(
    (targetId: string) => {
      if (draggingId && draggingId !== targetId) void movePane(draggingId, targetId);
      setDraggingId(null);
      setDropTargetId(null);
    },
    [draggingId, movePane],
  );

  const toggleMuteAll = useCallback(() => {
    void getApi()?.setMutedAll(!allMuted);
    toast(allMuted ? 'All panes unmuted' : 'All panes muted', 'info');
  }, [allMuted, toast]);

  const reloadAll = useCallback(() => {
    for (const pane of panes) void getApi()?.reload(pane.id);
    toast('Reloading every pane', 'info');
  }, [panes, toast]);

  const handleClearAll = useCallback(async () => {
    await clearAll();
    setFocusedId(null);
    toast('All panes cleared', 'info');
  }, [clearAll, toast]);

  useHotkeys(
    useMemo(
      () => ({
        a: () => setAddOpen(true),
        escape: () => {
          if (!addOpen && !confirmClearOpen) setFocusedId(null);
        },
      }),
      [addOpen, confirmClearOpen],
    ),
  );

  return (
    <div className="viewer">
      <Toolbar
        count={count}
        layout={layout}
        onLayoutChange={setLayout}
        allMuted={allMuted}
        soloActive={soloId !== null}
        onToggleMuteAll={toggleMuteAll}
        onClearSolo={() => void setSolo(null)}
        onReloadAll={reloadAll}
        onAddPanes={() => setAddOpen(true)}
        onClearAll={() => setConfirmClearOpen(true)}
      />

      {focusedId && (
        <div className="viewer__focus-bar">
          <span>Focus mode · Esc to exit</span>
          <button type="button" className="btn btn--sm" onClick={() => setFocusedId(null)}>
            Exit Focus
          </button>
        </div>
      )}

      <main className="viewer__main">
        {count === 0 ? (
          <EmptyState onAdd={() => setAddOpen(true)} />
        ) : (
          <PaneGrid
            panes={panes}
            order={order}
            layout={layout}
            focusedId={focusedId}
            soloId={soloId}
            draggingId={draggingId}
            dropTargetId={dropTargetId}
            suspended={suspended}
            onContentRef={onContentRef}
            onRemove={(id) => void handleRemove(id)}
            onToggleFocus={handleToggleFocus}
            onToggleSolo={(id) => void handleToggleSolo(id)}
            onDragStart={handleDragStart}
            onDragEnter={handleDragEnter}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
          />
        )}
      </main>

      <AddPanesModal open={addOpen} onClose={() => setAddOpen(false)} />

      <ConfirmDialog
        open={confirmClearOpen}
        title={`Close all ${count} ${count === 1 ? 'pane' : 'panes'}?`}
        message="This closes every browser pane and clears the saved session."
        confirmLabel="Clear all"
        onConfirm={() => void handleClearAll()}
        onClose={() => setConfirmClearOpen(false)}
      />
    </div>
  );
}
