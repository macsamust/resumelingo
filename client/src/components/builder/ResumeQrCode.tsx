import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface Props {
  /** The resume's own public link — see ResumeEditPage's Sharing section. */
  url: string;
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
export function ResumeQrCode({ url }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    setError(null);
    QRCode.toCanvas(canvasRef.current, url, { width: 160, margin: 1 }).catch(() => {
      setError("Couldn't generate a QR code for this link.");
    });
  }, [url]);

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
          <button type="button" className="btn btn-ghost btn-sm" disabled={downloading} onClick={downloadPng}>
            {downloading ? "Preparing…" : "Download QR code"}
          </button>
        </>
      )}
    </div>
  );
}
