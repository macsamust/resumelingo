export interface SortState<K extends string> {
  key: K;
  direction: "asc" | "desc";
}

interface SortableHeaderProps<K extends string> {
  label: string;
  sortKey: K;
  sort: SortState<K>;
  onSort: (key: K) => void;
}

/** Clickable <th> for admin tables (Users, Templates) — click to sort by this column, click again to flip direction. */
export function SortableHeader<K extends string>({ label, sortKey, sort, onSort }: SortableHeaderProps<K>) {
  const active = sort.key === sortKey;
  return (
    <th
      className={`admin-sortable-th ${active ? "active" : ""}`}
      onClick={() => onSort(sortKey)}
      aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
    >
      {label}
      {/* aria-hidden: the <th>'s own aria-sort already communicates sort state to screen readers, so this glyph would just be redundant/confusing noise read aloud. */}
      <span className="admin-sort-arrow" aria-hidden="true">
        {active ? (sort.direction === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    </th>
  );
}

/** Toggles direction if already sorting by `key`, otherwise switches to `key` ascending. */
export function nextSortState<K extends string>(current: SortState<K>, key: K): SortState<K> {
  if (current.key === key) {
    return { key, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  return { key, direction: "asc" };
}
