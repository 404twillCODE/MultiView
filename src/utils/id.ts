/** Stable unique ids for video cards (also used as React keys). */

let counter = 0;

export function createId(prefix = 'v'): string {
  counter += 1;
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}_${random}`;
}
