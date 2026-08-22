/**
 * Minimal CSV builder shared by every admin "Export CSV" endpoint (Users,
 * Resumes, Audit Log — see the respective AdminXController.exportCsv). Only
 * handles what a spreadsheet actually needs: comma/quote/newline escaping
 * via RFC 4180's double-quote-and-double-up rule. No library needed for
 * something this small.
 */
export function toCsv<T extends object>(rows: T[], columns: { key: keyof T; header: string }[]): string {
  const headerLine = columns.map((c) => escapeCsvCell(c.header)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCsvCell(row[c.key])).join(","));
  return [headerLine, ...lines].join("\r\n");
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
