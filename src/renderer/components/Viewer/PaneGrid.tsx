import type { LayoutMode, PaneSnapshot } from '../../../shared/ipc';
import { PaneCard } from './PaneCard';
import './PaneGrid.css';

interface PaneGridProps {
  panes: PaneSnapshot[];
  order: string[];
  layout: LayoutMode;
  focusedId: string | null;
  soloId: string | null;
  draggingId: string | null;
  dropTargetId: string | null;
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

/**
 * Responsive wall of pane cards.
 *
 * Cards render in insertion order and are positioned with CSS `order` so
 * rearranging never remounts a card (and therefore never drops its content
 * ref mid-drag). The native WebContentsView for each pane is positioned over
 * `.pane__content` by the bounds sync hook.
 */
export function PaneGrid({
  panes,
  order,
  layout,
  focusedId,
  soloId,
  draggingId,
  dropTargetId,
  suspended,
  ...handlers
}: PaneGridProps) {
  const positions = new Map(order.map((id, index) => [id, index]));
  const focusActive = focusedId !== null;

  return (
    <div
      className={`pgrid pgrid--layout-${layout} ${focusActive ? 'pgrid--focus' : ''}`}
      data-count={panes.length}
    >
      {panes.map((pane) => {
        const position = positions.get(pane.id) ?? 0;
        return (
          <PaneCard
            key={pane.id}
            pane={pane}
            position={position + 1}
            cssOrder={focusedId === pane.id ? -1 : position}
            focused={focusedId === pane.id}
            focusActive={focusActive}
            solo={soloId === pane.id}
            dragging={draggingId === pane.id}
            dropTarget={dropTargetId === pane.id && draggingId !== pane.id}
            suspended={suspended}
            {...handlers}
          />
        );
      })}
    </div>
  );
}
