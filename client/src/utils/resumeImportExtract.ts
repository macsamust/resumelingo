/**
 * Client-side text extraction for the "Import Resume" feature (see
 * ResumeImportPanel.tsx and worker's ResumeImportService.ts). Extraction
 * happens here, in the browser, rather than sending the raw file to the
 * Worker — PDF/DOCX parsing libraries generally assume Node APIs the
 * Workers runtime doesn't have, and there's no reason for the server to
 * ever see the original file when only its text matters. The Worker only
 * ever receives plain text.
 */

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB — resumes are never this large; guards against someone uploading the wrong file entirely.

export class ResumeImportExtractError extends Error {}

function extensionOf(file: File): string {
  const dot = file.name.lastIndexOf(".");
  return dot === -1 ? "" : file.name.slice(dot + 1).toLowerCase();
}

async function extractPdfText(file: File): Promise<string> {
  // Dynamically imported so pdfjs-dist (a sizeable dependency) only loads
  // when someone actually imports a PDF, not on every page that touches
  // this module.
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageTexts: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    pageTexts.push(pageText);
  }
  return pageTexts.join("\n");
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/** Extracts plain text from an uploaded resume file. Supports .pdf, .docx, and .txt. Throws ResumeImportExtractError with a message safe to show the user for anything else (unsupported type, empty/unreadable file, oversized upload). */
export async function extractResumeText(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new ResumeImportExtractError("That file is too large. Resumes should be well under 8MB.");
  }

  const ext = extensionOf(file);
  let text: string;
  try {
    if (ext === "pdf" || file.type === "application/pdf") {
      text = await extractPdfText(file);
    } else if (ext === "docx" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      text = await extractDocxText(file);
    } else if (ext === "txt" || file.type === "text/plain") {
      text = await file.text();
    } else if (ext === "doc") {
      throw new ResumeImportExtractError(
        "Old format .doc files aren't supported. Please save it as .docx or .pdf and try again."
      );
    } else {
      throw new ResumeImportExtractError("Unsupported file type. Please upload a PDF, Word (.docx), or plain text resume.");
    }
  } catch (err) {
    if (err instanceof ResumeImportExtractError) throw err;
    throw new ResumeImportExtractError(
      `Couldn't read that file (${err instanceof Error ? err.message : "unknown error"}). It may be corrupted, scanned/image-only, or password protected.`
    );
  }

  if (!text.trim()) {
    throw new ResumeImportExtractError(
      "No readable text was found in that file. It may be a scanned image rather than real text."
    );
  }
  return text;
}
