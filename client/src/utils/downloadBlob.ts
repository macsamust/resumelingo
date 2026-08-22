/**
 * Triggers a browser download for an already-fetched Blob (see
 * ApiClient.getBlob) — used by every admin "Export CSV" button. A plain
 * `<a href>` pointing at the API can't carry the Authorization header these
 * endpoints require, so the file has to be fetched first and turned into an
 * object URL here instead.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
