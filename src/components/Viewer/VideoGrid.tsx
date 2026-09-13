import type { LayoutMode, PlayerControls, VideoSource } from '../../types';
import { VideoCard } from './VideoCard';
import './VideoGrid.css';

interface VideoGridProps {
  /** Insertion order — kept as the DOM order so reordering never reloads. */
  videos: VideoSource[];
  /** Display order (ids). */
  order: string[];
  layout: LayoutMode;
  getControls: (id: string) => PlayerControls;
  focusedId: string | null;
  draggingId: string | null;
  dropTargetId: string | null;
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

/**
 * The responsive wall.
 *
 * Cards are rendered in a stable insertion order and positioned with the CSS
 * `order` property. Reordering therefore never moves a DOM node, which matters
 * because moving an `<iframe>` in the document forces it to reload.
 */
export function VideoGrid({
  videos,
  order,
  layout,
  getControls,
  focusedId,
  draggingId,
  dropTargetId,
  ...handlers
}: VideoGridProps) {
  const positions = new Map(order.map((id, index) => [id, index]));
  const focusActive = focusedId !== null;

  return (
    <div
      className={`grid grid--layout-${layout} ${focusActive ? 'grid--focus' : ''}`}
      data-count={videos.length}
    >
      {videos.map((video) => {
        const position = positions.get(video.id) ?? 0;
        return (
          <VideoCard
            key={video.id}
            video={video}
            position={position + 1}
            /* The focused card floats to the top of the wall. */
            cssOrder={focusedId === video.id ? -1 : position}
            controls={getControls(video.id)}
            focused={focusedId === video.id}
            focusActive={focusActive}
            dragging={draggingId === video.id}
            dropTarget={dropTargetId === video.id && draggingId !== video.id}
            canMoveEarlier={position > 0}
            canMoveLater={position < order.length - 1}
            {...handlers}
          />
        );
      })}
    </div>
  );
}
