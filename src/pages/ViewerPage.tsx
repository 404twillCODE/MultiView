import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AddVideosModal } from '../components/Viewer/AddVideosModal';
import { EmptyState } from '../components/Viewer/EmptyState';
import { Toolbar } from '../components/Viewer/Toolbar';
import { VideoGrid } from '../components/Viewer/VideoGrid';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import { useVideoStore } from '../context/VideoStore';
import { useHotkeys } from '../hooks/useHotkeys';
import { usePlayerControls } from '../hooks/usePlayerControls';
import { buildShareLink, copyToClipboard, readSharedUrls } from '../utils/share';
import { supportsMuteControl } from '../utils/videoParser';
import './ViewerPage.css';

/** Page 2 — the video wall. */
export function ViewerPage() {
  const { videos, orderedVideos, order, count, layout, setLayout, removeVideo, clearAll, moveVideo, addFromText } =
    useVideoStore();
  const { toast } = useToast();
  const controls = usePlayerControls();
  const navigate = useNavigate();
  const location = useLocation();

  const [addOpen, setAddOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  /* ------------------------------------------------- shared link importing */

  const importedSearch = useRef<string | null>(null);

  useEffect(() => {
    if (!location.search || importedSearch.current === location.search) return;
    importedSearch.current = location.search;

    const shared = readSharedUrls(location.search);
    // Always drop the parameters again so a refresh doesn't re-import.
    navigate('/watch', { replace: true });
    if (shared.length === 0) return;

    const { added, duplicates } = addFromText(shared.join('\n'));
    if (added.length > 0) {
      toast(
        `${added.length} ${added.length === 1 ? 'video' : 'videos'} opened from shared link`,
        'success',
      );
    } else if (duplicates > 0) {
      toast('Everything in that link is already open', 'info');
    }
  }, [location.search, navigate, addFromText, toast]);

  /* ------------------------------------------------------ derived mute state */

  const mutableIds = useMemo(
    () => videos.filter((video) => supportsMuteControl(video.kind)).map((video) => video.id),
    [videos],
  );

  const allMuted =
    mutableIds.length > 0 && mutableIds.every((id) => controls.get(id).muted);

  /* ---------------------------------------------------------------- actions */

  const openAdd = useCallback(() => setAddOpen(true), []);

  const handleRemove = useCallback(
    (id: string) => {
      removeVideo(id);
      setFocusedId((current) => (current === id ? null : current));
      toast('Video removed', 'info');
    },
    [removeVideo, toast],
  );

  const handleToggleFocus = useCallback((id: string) => {
    setFocusedId((current) => (current === id ? null : id));
  }, []);

  const handleMove = useCallback(
    (id: string, direction: -1 | 1) => {
      const index = order.indexOf(id);
      const target = order[index + direction];
      if (target) moveVideo(id, target);
    },
    [order, moveVideo],
  );

  const handleDragStart = useCallback((id: string) => setDraggingId(id), []);
  const handleDragEnter = useCallback((id: string) => setDropTargetId(id), []);
  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropTargetId(null);
  }, []);

  const handleDrop = useCallback(
    (targetId: string) => {
      if (draggingId && draggingId !== targetId) moveVideo(draggingId, targetId);
      setDraggingId(null);
      setDropTargetId(null);
    },
    [draggingId, moveVideo],
  );

  const toggleMuteAll = useCallback(() => {
    controls.setMutedForAll(mutableIds, !allMuted);
    toast(allMuted ? 'All players unmuted' : 'All players muted', 'info');
  }, [controls, mutableIds, allMuted, toast]);

  const reloadAll = useCallback(() => {
    controls.reloadAll(videos.map((video) => video.id));
    toast('Reloading every player', 'info');
  }, [controls, videos, toast]);

  const share = useCallback(async () => {
    const { url, tooLong } = buildShareLink(orderedVideos.map((video) => video.originalUrl));
    const copied = await copyToClipboard(url);
    if (!copied) {
      toast('Could not copy the share link', 'error');
      return;
    }
    toast(
      tooLong
        ? 'Share link copied — it is very long, some apps may cut it off'
        : 'Share link copied',
      tooLong ? 'info' : 'success',
    );
  }, [orderedVideos, toast]);

  const handleClearAll = useCallback(() => {
    clearAll();
    setFocusedId(null);
    toast('All videos cleared', 'info');
  }, [clearAll, toast]);

  /* -------------------------------------------------------------- shortcuts */

  useHotkeys(
    useMemo(
      () => ({
        a: () => setAddOpen(true),
        escape: () => {
          // The modal closes itself; Escape here leaves focus mode.
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
        canMuteAny={mutableIds.length > 0}
        onToggleMuteAll={toggleMuteAll}
        onReloadAll={reloadAll}
        onAddVideos={openAdd}
        onClearAll={() => setConfirmClearOpen(true)}
        onShare={share}
      />

      {focusedId && (
        <div className="viewer__focus-bar">
          <span>Focus mode</span>
          <button type="button" className="btn btn--sm" onClick={() => setFocusedId(null)}>
            Exit Focus
          </button>
        </div>
      )}

      <main className="viewer__main">
        {count === 0 ? (
          <EmptyState onAddVideos={openAdd} />
        ) : (
          <VideoGrid
            videos={videos}
            order={order}
            layout={layout}
            getControls={controls.get}
            focusedId={focusedId}
            draggingId={draggingId}
            dropTargetId={dropTargetId}
            onRemove={handleRemove}
            onReload={controls.reload}
            onToggleMuted={controls.toggleMuted}
            onSetPlaybackRate={controls.setPlaybackRate}
            onToggleFocus={handleToggleFocus}
            onMove={handleMove}
            onDragStart={handleDragStart}
            onDragEnter={handleDragEnter}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
          />
        )}
      </main>

      <AddVideosModal open={addOpen} onClose={() => setAddOpen(false)} />

      <ConfirmDialog
        open={confirmClearOpen}
        title={`Remove all ${count} ${count === 1 ? 'video' : 'videos'}?`}
        message="This closes every player and clears the saved session. Your last pasted links stay on the start page."
        confirmLabel="Clear all"
        onConfirm={handleClearAll}
        onClose={() => setConfirmClearOpen(false)}
      />
    </div>
  );
}
