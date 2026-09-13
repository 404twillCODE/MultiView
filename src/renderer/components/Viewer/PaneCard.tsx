import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Copy,
  ExternalLink,
  GripVertical,
  Home,
  Maximize2,
  Minimize2,
  MoreVertical,
  RotateCw,
  SquareArrowOutUpRight,
  Terminal,
  Trash2,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { memo, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { PaneSnapshot } from '../../../shared/ipc';
import { useToast } from '../../context/ToastContext';
import { getApi } from '../../lib/api';
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '../ui/Menu';
import './PaneCard.css';

export interface PaneCardProps {
  pane: PaneSnapshot;
  position: number;
  cssOrder: number;
  focused: boolean;
  focusActive: boolean;
  solo: boolean;
  dragging: boolean;
  dropTarget: boolean;
  suspended: boolean;
  onContentRef: (id: string, element: HTMLElement | null) => void;
  onRemove: (id: string) => void;
  onToggleFocus: (id: string) => void;
  onToggleSolo: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnter: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (targetId: string) => void;
}

function PaneCardImpl({
  pane,
  position,
  cssOrder,
  focused,
  focusActive,
  solo,
  dragging,
  dropTarget,
  suspended,
  onContentRef,
  onRemove,
  onToggleFocus,
  onToggleSolo,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
}: PaneCardProps) {
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [draftUrl, setDraftUrl] = useState(pane.currentUrl);
  const [draggable, setDraggable] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const addressRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onContentRef(pane.id, contentRef.current);
    return () => onContentRef(pane.id, null);
  }, [pane.id, onContentRef, focused, focusActive, suspended]);

  useEffect(() => {
    if (!editing) setDraftUrl(pane.currentUrl);
  }, [pane.currentUrl, editing]);

  useEffect(() => {
    if (editing) addressRef.current?.select();
  }, [editing]);

  const label = pane.title || pane.hostname || `Site ${position}`;

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(pane.currentUrl);
      toast('URL copied', 'success');
    } catch {
      toast('Could not copy the URL', 'error');
    }
  }

  function navigateDraft() {
    const api = getApi();
    if (!api) return;
    const next = draftUrl.trim();
    if (!next) return;
    void api.navigate(pane.id, next);
    setEditing(false);
  }

  function armDrag(event: ReactPointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest('button, a, input, [role="menu"]')) return;
    setDraggable(true);
  }

  return (
    <article
      className={[
        'pane',
        focused ? 'pane--focused' : '',
        focusActive && !focused ? 'pane--shrunk' : '',
        dragging ? 'pane--dragging' : '',
        dropTarget ? 'pane--drop-target' : '',
        menuOpen || editing ? 'pane--elevated' : '',
        solo ? 'pane--solo' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ order: cssOrder }}
      aria-label={`Site ${position}: ${label}`}
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', pane.id);
        event.dataTransfer.effectAllowed = 'move';
        onDragStart(pane.id);
      }}
      onDragEnter={() => onDragEnter(pane.id)}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(pane.id);
        setDraggable(false);
      }}
      onDragEnd={() => {
        setDraggable(false);
        onDragEnd();
      }}
      onDoubleClick={(event) => {
        if ((event.target as HTMLElement).closest('.pane__content, input, button')) return;
        onToggleFocus(pane.id);
      }}
    >
      <header
        className="pane__header"
        onPointerDown={armDrag}
        onPointerUp={() => setDraggable(false)}
      >
        <span className="pane__grip" aria-hidden="true" title="Drag to rearrange">
          <GripVertical size={14} />
        </span>

        <span className="pane__index">Site {position}</span>

        {editing ? (
          <form
            className="pane__address"
            onSubmit={(event) => {
              event.preventDefault();
              navigateDraft();
            }}
          >
            <input
              ref={addressRef}
              className="pane__address-input mono"
              value={draftUrl}
              onChange={(event) => setDraftUrl(event.target.value)}
              onBlur={() => setEditing(false)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setEditing(false);
                }
              }}
              aria-label={`Address for site ${position}`}
              spellCheck={false}
            />
          </form>
        ) : (
          <button
            type="button"
            className="pane__host"
            title={pane.currentUrl}
            onClick={() => setEditing(true)}
          >
            {pane.loading && <span className="pane__spinner" aria-hidden="true" />}
            <span className="pane__host-text">{pane.hostname || 'loading…'}</span>
            {pane.title && <span className="pane__title">{pane.title}</span>}
          </button>
        )}

        <div className="pane__actions">
          <button
            type="button"
            className="btn btn--ghost btn--icon btn--sm"
            disabled={!pane.canGoBack}
            onClick={() => void getApi()?.goBack(pane.id)}
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft size={14} />
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--icon btn--sm"
            disabled={!pane.canGoForward}
            onClick={() => void getApi()?.goForward(pane.id)}
            aria-label="Forward"
            title="Forward"
          >
            <ArrowRight size={14} />
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--icon btn--sm"
            onClick={() => void (pane.loading ? getApi()?.stop(pane.id) : getApi()?.reload(pane.id))}
            aria-label={pane.loading ? 'Stop' : 'Reload'}
            title={pane.loading ? 'Stop' : 'Reload'}
          >
            <RotateCw size={14} className={pane.loading ? 'pane__spinning' : undefined} />
          </button>
          <button
            type="button"
            className={`btn btn--ghost btn--icon btn--sm ${pane.muted ? 'btn--active' : ''}`}
            onClick={() => void getApi()?.setMuted(pane.id, !pane.muted)}
            aria-pressed={pane.muted}
            aria-label={pane.muted ? 'Unmute' : 'Mute'}
            title={pane.muted ? 'Unmute' : 'Mute'}
          >
            {pane.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <button
            type="button"
            className={`btn btn--ghost btn--icon btn--sm ${focused ? 'btn--active' : ''}`}
            onClick={() => onToggleFocus(pane.id)}
            aria-pressed={focused}
            aria-label={focused ? 'Exit focus' : 'Focus'}
            title={focused ? 'Exit focus' : 'Focus'}
          >
            {focused ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          <Menu
            triggerClassName="btn btn--ghost btn--icon btn--sm"
            triggerLabel={`Options for site ${position}`}
            iconOnly
            onOpenChange={setMenuOpen}
            trigger={<MoreVertical size={14} aria-hidden="true" />}
          >
            <MenuItem
              icon={<SquareArrowOutUpRight size={15} />}
              onSelect={() => void getApi()?.openExternal(pane.currentUrl)}
            >
              Open original URL
            </MenuItem>
            <MenuItem icon={<Copy size={15} />} onSelect={() => void copyUrl()}>
              Copy URL
            </MenuItem>
            <MenuItem
              icon={<Home size={15} />}
              onSelect={() => void getApi()?.returnHome(pane.id)}
            >
              Return to original URL
            </MenuItem>
            <MenuItem
              icon={<RotateCw size={15} />}
              onSelect={() => void getApi()?.reload(pane.id)}
            >
              Reload
            </MenuItem>

            <MenuSeparator />
            <MenuItem
              icon={pane.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              onSelect={() => void getApi()?.setMuted(pane.id, !pane.muted)}
              keepOpen
              checked={pane.muted}
            >
              {pane.muted ? 'Unmute' : 'Mute'}
            </MenuItem>
            <MenuItem
              icon={<AudioLines size={15} />}
              onSelect={() => onToggleSolo(pane.id)}
              keepOpen
              checked={solo}
            >
              {solo ? 'Clear solo audio' : 'Solo audio'}
            </MenuItem>

            <MenuSeparator />
            <MenuLabel>Zoom · {Math.round(pane.zoomFactor * 100)}%</MenuLabel>
            <MenuItem
              icon={<ZoomIn size={15} />}
              onSelect={() => void getApi()?.setZoom(pane.id, pane.zoomFactor + 0.1)}
              keepOpen
            >
              Zoom in
            </MenuItem>
            <MenuItem
              icon={<ZoomOut size={15} />}
              onSelect={() => void getApi()?.setZoom(pane.id, pane.zoomFactor - 0.1)}
              keepOpen
            >
              Zoom out
            </MenuItem>
            <MenuItem
              icon={<Maximize2 size={15} />}
              onSelect={() => void getApi()?.setZoom(pane.id, 1)}
              keepOpen
            >
              Reset zoom
            </MenuItem>

            <MenuSeparator />
            <MenuItem
              icon={<Terminal size={15} />}
              onSelect={() => void getApi()?.openDevTools(pane.id)}
            >
              Developer Tools
            </MenuItem>
            <MenuItem
              icon={<ExternalLink size={15} />}
              onSelect={() => void getApi()?.openExternal(pane.currentUrl)}
            >
              Open in system browser
            </MenuItem>

            <MenuSeparator />
            <MenuItem
              icon={<Trash2 size={15} />}
              tone="danger"
              onSelect={() => onRemove(pane.id)}
            >
              Remove pane
            </MenuItem>
          </Menu>

          <button
            type="button"
            className="btn btn--ghost btn--icon btn--sm pane__close"
            onClick={() => onRemove(pane.id)}
            aria-label={`Close site ${position}`}
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      {/*
        The native WebContentsView is composited over this element by the main
        process. Keep it empty — never put a transparent overlay here or clicks
        will never reach the website.
      */}
      <div
        className="pane__content"
        ref={contentRef}
        data-pane-id={pane.id}
        aria-hidden="true"
      >
        {pane.error && (
          <div className="pane__error">
            <p>Couldn&rsquo;t load this page</p>
            <span className="mono">{pane.error}</span>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => void getApi()?.reload(pane.id)}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export const PaneCard = memo(PaneCardImpl);
