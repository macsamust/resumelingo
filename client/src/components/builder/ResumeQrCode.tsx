import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface Props {
  /** The resume's own public link — see ResumeEditPage's Sharing section. */
  url: string;
  /** On-screen/print canvas size in px. Defaults to 160 (the editor's Sharing-section preview size); PublicResumePage's print-only corner code uses a smaller size to match a business-card-scale footprint on the printed page. */
  size?: number;
  /** Hides the "Download QR code" button — used on PublicResumePage's print-only corner code, where a download control would never actually be visible (it only renders under @media print, at which point there's nothing to click). Defaults to true. */
  showDownload?: boolean;
}

/**
 * Prototype: a scannable QR code for this resume's public link.
 *
 * The use case is a printed resume or an in-person handoff — a job fair, a
 * networking event, handing someone a physical copy at an interview.
 * Scanning it takes them straight to the live, always-current version
 * (Recruiter Mode card included) instead of a URL they'd have to type in by
 * hand, and unlike the printed page itself, the destination stays current
 * even after the resume's content changes.
 *
 * Generated entirely client-side via the `qrcode` package — the resume's
 * URL is never sent to a third-party QR-generation API/service, consistent
 * with how the rest of this app treats resume data (no unnecessary
 * third-party data sharing).
 */
export function ResumeQrCode({ url, size = 160, showDownload = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    setError(null);
    QRCode.toCanvas(canvasRef.current, url, { width: size, margin: 1 }).catch(() => {
      setError("Couldn't generate a QR code for this link.");
    });
  }, [url, size]);

  const downloadPng = async () => {
    setDownloading(true);
    try {
      // Higher resolution than the on-screen preview — this is meant to be
      // printed (e.g. onto a physical resume or business card), where a
      // 160px-wide PNG would look visibly pixelated.
      const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 1 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "resume-qr-code.png";
      a.click();
    } catch {
      setError("Couldn't download the QR code.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="resume-qr-code">
      {error ? (
        <p className="form-error" style={{ margin: 0 }}>
          {error}
        </p>
      ) : (
        <>
          <canvas ref={canvasRef} aria-label="QR code linking to this resume's public link" />
          {showDownload && (
            <button type="button" className="btn btn-ghost btn-sm" disabled={downloading} onClick={downloadPng}>
              {downloading ? "Preparing…" : "Download QR code"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
