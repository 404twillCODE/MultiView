import {
  ArrowLeft,
  ArrowRight,
  Copy,
  ExternalLink,
  Expand,
  GripVertical,
  Maximize2,
  Minimize2,
  MoreVertical,
  RotateCw,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { memo, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useToast } from '../../context/ToastContext';
import type { PlayerControls, VideoSource } from '../../types';
import {
  exitFullscreen,
  fullscreenElement,
  isFullscreenSupported,
  onFullscreenChange,
  requestFullscreen,
} from '../../utils/fullscreen';
import { copyToClipboard } from '../../utils/share';
import { supportsMuteControl } from '../../utils/videoParser';
import { Menu, MenuItem, MenuLabel, MenuRow, MenuSeparator } from '../ui/Menu';
import { VideoPlayer } from './VideoPlayer';
import './VideoCard.css';

const SPEEDS = [0.5, 1, 1.5, 2];

export interface VideoCardProps {
  video: VideoSource;
  /** 1-based position in the display order, shown in the header. */
  position: number;
  /** CSS `order` value, so reordering never moves DOM nodes (and never reloads). */
  cssOrder: number;
  controls: PlayerControls;
  focused: boolean;
  /** True when any card is focused, so the others can shrink. */
  focusActive: boolean;
  dragging: boolean;
  dropTarget: boolean;
  canMoveEarlier: boolean;
  canMoveLater: boolean;
  onRemove: (id: string) => void;
  onReload: (id: string) => void;
  onToggleMuted: (id: string) => void;
  onSetPlaybackRate: (id: string, rate: number) => void;
  onToggleFocus: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onDragStart: (id: string) => void;
  onDragEnter: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (targetId: string) => void;
}

function VideoCardImpl({
  video,
  position,
  cssOrder,
  controls,
  focused,
  focusActive,
  dragging,
  dropTarget,
  canMoveEarlier,
  canMoveLater,
  onRemove,
  onReload,
  onToggleMuted,
  onSetPlaybackRate,
  onToggleFocus,
  onMove,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
}: VideoCardProps) {
  const { toast } = useToast();
  const mediaRef = useRef<HTMLDivElement>(null);

  const [draggable, setDraggable] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const label = `Video ${position}: ${video.provider}`;
  const canMute = supportsMuteControl(video.kind);
  const canSetSpeed = video.kind === 'file';

  useEffect(
    () => onFullscreenChange(() => setIsFullscreen(fullscreenElement() === mediaRef.current)),
    [],
  );

  async function toggleFullscreen() {
    if (fullscreenElement() === mediaRef.current) {
      await exitFullscreen();
      return;
    }
    await requestFullscreen(mediaRef.current);
  }

  async function copyUrl() {
    const ok = await copyToClipboard(video.originalUrl);
    toast(ok ? 'URL copied' : 'Could not copy the URL', ok ? 'success' : 'error');
  }

  /** Arms HTML5 dragging only when the grab starts on the header itself. */
  function armDrag(event: ReactPointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest('button, a, [role="menu"]')) return;
    setDraggable(true);
  }

  return (
    <article
      className={[
        'card',
        focused ? 'card--focused' : '',
        focusActive && !focused ? 'card--shrunk' : '',
        dragging ? 'card--dragging' : '',
        dropTarget ? 'card--drop-target' : '',
        menuOpen ? 'card--menu-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ order: cssOrder }}
      aria-label={label}
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', video.id);
        event.dataTransfer.effectAllowed = 'move';
        onDragStart(video.id);
      }}
      onDragEnter={() => onDragEnter(video.id)}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(video.id);
        setDraggable(false);
      }}
      onDragEnd={() => {
        setDraggable(false);
        onDragEnd();
      }}
    >
      <header className="card__header" onPointerDown={armDrag} onPointerUp={() => setDraggable(false)}>
        <span className="card__grip" aria-hidden="true" title="Drag to rearrange">
          <GripVertical size={14} />
        </span>
        <span className="card__index">Video {position}</span>
        <span className="card__host" title={video.originalUrl}>
          {video.hostname}
        </span>

        <div className="card__actions">
          {canMute && (
            <button
              type="button"
              className={`btn btn--ghost btn--icon btn--sm card__action ${
                controls.muted ? 'btn--active' : ''
              }`}
              onClick={() => onToggleMuted(video.id)}
              aria-pressed={controls.muted}
              aria-label={controls.muted ? `Unmute video ${position}` : `Mute video ${position}`}
              title={controls.muted ? 'Unmute' : 'Mute'}
            >
              {controls.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          )}

          <button
            type="button"
            className={`btn btn--ghost btn--icon btn--sm card__action ${focused ? 'btn--active' : ''}`}
            onClick={() => onToggleFocus(video.id)}
            aria-pressed={focused}
            aria-label={focused ? 'Exit focus mode' : `Focus video ${position}`}
            title={focused ? 'Exit focus' : 'Focus mode'}
          >
            {focused ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          {isFullscreenSupported() && (
            <button
              type="button"
              className="btn btn--ghost btn--icon btn--sm card__action"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : `Show video ${position} fullscreen`}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              <Expand size={15} />
            </button>
          )}

          <Menu
            triggerClassName="btn btn--ghost btn--icon btn--sm"
            triggerLabel={`Options for video ${position}`}
            iconOnly
            onOpenChange={setMenuOpen}
            trigger={<MoreVertical size={15} aria-hidden="true" />}
          >
            <MenuItem icon={<RotateCw size={15} />} onSelect={() => onReload(video.id)}>
              Reload
            </MenuItem>
            <MenuItem icon={<Copy size={15} />} onSelect={copyUrl}>
              Copy URL
            </MenuItem>
            <MenuItem
              icon={<ExternalLink size={15} />}
              onSelect={() => window.open(video.originalUrl, '_blank', 'noopener,noreferrer')}
            >
              Open Original
            </MenuItem>
            <MenuItem
              icon={focused ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              onSelect={() => onToggleFocus(video.id)}
            >
              {focused ? 'Exit focus mode' : 'Focus mode'}
            </MenuItem>

            <MenuSeparator />
            <MenuLabel>Position</MenuLabel>
            <MenuItem
              icon={<ArrowLeft size={15} />}
              onSelect={() => onMove(video.id, -1)}
              disabled={!canMoveEarlier}
              keepOpen
            >
              Move earlier
            </MenuItem>
            <MenuItem
              icon={<ArrowRight size={15} />}
              onSelect={() => onMove(video.id, 1)}
              disabled={!canMoveLater}
              keepOpen
            >
              Move later
            </MenuItem>

            {canMute && (
              <>
                <MenuSeparator />
                <MenuItem
                  icon={controls.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  onSelect={() => onToggleMuted(video.id)}
                  keepOpen
                  checked={controls.muted}
                >
                  {controls.muted ? 'Unmute' : 'Mute'}
                </MenuItem>
              </>
            )}

            {canSetSpeed && (
              <>
                <MenuLabel>Playback speed</MenuLabel>
                <MenuRow>
                  {SPEEDS.map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      className={`btn btn--sm ${
                        controls.playbackRate === speed ? 'btn--active' : ''
                      }`}
                      onClick={() => onSetPlaybackRate(video.id, speed)}
                      aria-pressed={controls.playbackRate === speed}
                    >
                      {speed}×
                    </button>
                  ))}
                </MenuRow>
              </>
            )}

            <MenuSeparator />
            <MenuItem icon={<Trash2 size={15} />} tone="danger" onSelect={() => onRemove(video.id)}>
              Remove
            </MenuItem>
          </Menu>

          <button
            type="button"
            className="btn btn--ghost btn--icon btn--sm card__action card__action--remove"
            onClick={() => onRemove(video.id)}
            aria-label={`Remove video ${position}`}
            title="Remove"
          >
            <X size={15} />
          </button>
        </div>
      </header>

      <div className="card__media" ref={mediaRef}>
        <VideoPlayer video={video} controls={controls} label={label} />
      </div>
    </article>
  );
}

export const VideoCard = memo(VideoCardImpl);
