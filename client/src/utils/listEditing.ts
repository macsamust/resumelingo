/**
 * Small, generic helpers shared by every "add/remove a row" builder editor
 * (Experience, Education, Awards, Key Achievements, References) — they all
 * follow the exact same list-of-entries pattern, so Move Up/Down and
 * Duplicate are implemented once here instead of five times.
 */

/**
 * Returns a new array with the item at `index` swapped with its neighbor in
 * the given direction. No-ops (returns the same array reference) if the move
 * would go out of bounds, so a caller can wire this straight to a button's
 * onClick without a bounds check first — pair it with `disabled` on the
 * button itself for the visual affordance.
 */
export function moveItem<T>(list: T[], index: number, direction: "up" | "down"): T[] {
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= list.length) return list;
  const next = [...list];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}

/**
 * Inserts a copy of the item at `index` directly after it. `transform` lets
 * a caller adjust the copy before insertion — e.g. WorkExperienceEntry needs
 * a fresh `id` on its duplicate, since achievements link to a specific job
 * by id and a duplicated job silently sharing the original's id would nest
 * achievements under both entries at once.
 */
export function duplicateItem<T>(list: T[], index: number, transform?: (item: T) => T): T[] {
  const source = list[index];
  if (!source) return list;
  const copy = transform ? transform(source) : { ...source };
  const next = [...list];
  next.splice(index + 1, 0, copy);
  return next;
}
