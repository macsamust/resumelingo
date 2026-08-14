import { Skeleton } from "../common/Skeleton";

/**
 * Generic .admin-table-shaped skeleton, reused across every admin list
 * page (Users, Templates, Skill Suggestions) instead of a bespoke one per
 * page — the table chrome (header row, cell padding, borders) is identical
 * across all of them via the shared .admin-table class; only the column
 * count differs.
 */
export function AdminTableSkeleton({ columns, rows = 6 }: { columns: number; rows?: number }) {
  return (
    <table className="admin-table">
      <thead>
        <tr>
          {Array.from({ length: columns }).map((_, i) => (
            <th key={i}>
              <Skeleton width={i === columns - 1 ? 20 : "60%"} height={11} radius={4} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: columns }).map((_, c) => (
              <td key={c}>
                <Skeleton width={c === columns - 1 ? 60 : "75%"} height={14} radius={4} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
