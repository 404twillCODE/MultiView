import { useEffect, useRef } from 'react';

/** True when focus is in a field where plain letter shortcuts must not fire. */
export function isTypingElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable ||
    target.getAttribute('role') === 'textbox'
  );
}

/** Turns a keyboard event into a comparable combo string, e.g. `mod+enter`. */
function comboOf(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push('mod');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');
  parts.push(event.key.toLowerCase());
  return parts.join('+');
}

export type HotkeyMap = Record<string, (event: KeyboardEvent) => void>;

/**
 * Registers document level shortcuts.
 *
 * Plain keys (`a`) are ignored while the user types; `escape` and modifier
 * combos still work so dialogs stay dismissible from inside a textarea.
 */
export function useHotkeys(map: HotkeyMap, enabled = true): void {
  const mapRef = useRef(map);
  mapRef.current = map;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const combo = comboOf(event);
      const handler = mapRef.current[combo];
      if (!handler) return;

      const isSafeWhileTyping = combo === 'escape' || combo.startsWith('mod') || combo.startsWith('alt');
      if (!isSafeWhileTyping && isTypingElement(event.target)) return;

      handler(event);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
