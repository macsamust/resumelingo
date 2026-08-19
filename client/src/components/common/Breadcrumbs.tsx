import { Link } from "react-router-dom";

export interface Crumb {
  label: string;
  /** Omitted for the current page — renders as plain text instead of a link. */
  to?: string;
}

interface Props {
  items: Crumb[];
}

/**
 * A simple "Dashboard / Edit Resume" trail shown above a nested page's
 * `.app-page-head` — orientation that was previously missing entirely on
 * pages like Edit Resume, Career Coach, and the Thank-You Letter generator,
 * which only had (at most) a single "back" link at the very bottom of the
 * page, easy to miss on first load.
 */
export function Breadcrumbs({ items }: Props) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={i} className="breadcrumb-item">
          {item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
          {i < items.length - 1 && (
            <span className="breadcrumb-sep" aria-hidden="true">
              /
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
