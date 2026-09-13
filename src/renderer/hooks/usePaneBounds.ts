/**
 * Keeps native WebContentsView bounds locked to their React placeholders.
 *
 * Each pane card exposes a content ref. We observe those elements (and the
 * window) and push DIP coordinates to the main process. Electron's setBounds
 * already works in DIP, so no devicePixelRatio multiply is required.
 */

import { useEffect, useRef } from 'react';
import type { BoundsUpdate } from '../../shared/ipc';
import { getApi } from '../lib/api';

export interface PaneSlot {
  id: string;
  /** Element that the native view should cover. Null = hide the view. */
  element: HTMLElement | null;
  visible: boolean;
}

function measure(element: HTMLElement): BoundsUpdate['bounds'] {
  const rect = element.getBoundingClientRect();
  // getBoundingClientRect is relative to the viewport; for a non-scrolled
  // BrowserWindow that matches the contentView origin. Round to whole dips.
  return {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

function sameBounds(
  a: BoundsUpdate['bounds'] | null | undefined,
  b: BoundsUpdate['bounds'] | null | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

/**
 * @param slots Current pane slots. Pass a new array whenever layout/focus changes.
 * @param suspended When true (e.g. a modal is open), every view is hidden.
 */
export function usePaneBounds(slots: PaneSlot[], suspended: boolean): void {
  const lastSent = useRef(new Map<string, BoundsUpdate>());
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const suspendedRef = useRef(suspended);
  suspendedRef.current = suspended;
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const api = getApi();
    if (!api) return;

    const flush = () => {
      raf.current = null;
      const updates: BoundsUpdate[] = [];
      const seen = new Set<string>();

      for (const slot of slotsRef.current) {
        seen.add(slot.id);
        const visible = !suspendedRef.current && slot.visible && slot.element !== null;
        const bounds =
          visible && slot.element ? measure(slot.element) : null;
        // Skip degenerate sizes — they are almost always mid-layout frames.
        const safeBounds =
          bounds && bounds.width >= 2 && bounds.height >= 2 ? bounds : null;
        const next: BoundsUpdate = {
          id: slot.id,
          bounds: safeBounds,
          visible: Boolean(safeBounds),
        };
        const previous = lastSent.current.get(slot.id);
        if (
          previous &&
          previous.visible === next.visible &&
          sameBounds(previous.bounds, next.bounds)
        ) {
          continue;
        }
        lastSent.current.set(slot.id, next);
        updates.push(next);
      }

      // Hide anything that disappeared from the slot list.
      for (const id of [...lastSent.current.keys()]) {
        if (seen.has(id)) continue;
        updates.push({ id, bounds: null, visible: false });
        lastSent.current.delete(id);
      }

      if (updates.length > 0) void api.setBoundsBatch(updates);
    };

    const schedule = () => {
      if (raf.current !== null) return;
      raf.current = window.requestAnimationFrame(flush);
    };

    schedule();

    const observer = new ResizeObserver(() => schedule());
    for (const slot of slots) {
      if (slot.element) observer.observe(slot.element);
    }

    // Also observe the document element so toolbar / focus-bar size changes
    // (which shift every pane without resizing the pane element itself) flush.
    observer.observe(document.documentElement);

    window.addEventListener('resize', schedule);
    // Visual viewport accounts for zoom / OS scale changes on some platforms.
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);

    return () => {
      if (raf.current !== null) window.cancelAnimationFrame(raf.current);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
    };
  }, [slots, suspended]);
}
