export class ImageTooLargeError extends Error {}

const MAX_RAW_FILE_BYTES = 8 * 1024 * 1024; // 8MB — generous ceiling before we even try to process it
const MAX_DIMENSION = 480; // px on the longest side — plenty for a small circular header photo
const JPEG_QUALITY = 0.85;

/**
 * Reads an uploaded image file, downsizes it to at most MAX_DIMENSION on its
 * longest side, and re-encodes it as a JPEG data: URL. Keeps the stored
 * resume row small — photos are stored inline as a data: URL (see the
 * server's ResumeRecord.photoUrl column) rather than in a separate file
 * storage service, since this app doesn't have one configured.
 */
export async function fileToResizedDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > MAX_RAW_FILE_BYTES) {
    throw new ImageTooLargeError("That image is too large. Please choose one under 8MB.");
  }

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl; // canvas unsupported (shouldn't happen in any real browser) — fall back to the unresized original
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't read that image."));
    img.src = src;
  });
}
