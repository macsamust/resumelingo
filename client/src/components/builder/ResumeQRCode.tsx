/**
 * QR code linking to the resume's own public URL, shown on PublicResumePage
 * next to the Print/Download actions.
 *
 * Generated via a hosted QR image endpoint (api.qrserver.com — no API key,
 * simple GET-with-query-params image response) rather than a client-side
 * JS QR-encoding library, since this environment's npm registry access is
 * blocked and hand-rolling a QR encoder (Reed-Solomon error correction,
 * mask-pattern selection, etc.) isn't something that can be verified as
 * actually scannable without a real QR reader to test against. The
 * trade-off: rendering this requires outbound internet access, and the
 * resume's public URL is sent to that third-party service to render the
 * image. If that's ever a concern, swap this for a bundled QR library
 * (e.g. the "qrcode" npm package) — ResumeQRCode's props/usage wouldn't
 * need to change, just its internals.
 */
export function ResumeQRCode({ value, size = 104 }: { value: string; size?: number }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=0&data=${encodeURIComponent(value)}`;
  return (
    <img
      src={src}
      alt="QR code linking to this resume's public page"
      width={size}
      height={size}
      className="resume-qr-code"
      loading="lazy"
    />
  );
}
