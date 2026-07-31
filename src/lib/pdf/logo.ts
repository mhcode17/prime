import "server-only";
import type { PDFDocument, PDFImage, PDFPage } from "pdf-lib";

function dataUrlToBytes(u: string): Uint8Array {
  const b64 = u.includes(",") ? u.split(",")[1] : u;
  return Uint8Array.from(Buffer.from(b64, "base64"));
}

/** Embed a company logo (PNG or JPEG data URL) for use in a PDF. Null-safe. */
export async function embedLogo(
  pdf: PDFDocument,
  dataUrl: string | null | undefined,
): Promise<PDFImage | null> {
  if (!dataUrl || !dataUrl.startsWith("data:image")) return null;
  try {
    const bytes = dataUrlToBytes(dataUrl);
    if (/^data:image\/jpe?g/i.test(dataUrl)) return await pdf.embedJpg(bytes);
    return await pdf.embedPng(bytes);
  } catch {
    return null;
  }
}

/**
 * Draw a logo fit within maxW×maxH, right edge at `right`, vertically centered
 * on `centerY`. Returns the drawn width (0 when there is no image) so callers
 * can shift any other right-aligned element out of the way.
 */
export function drawLogoRight(
  page: PDFPage,
  image: PDFImage | null,
  opts: { right: number; centerY: number; maxW: number; maxH: number },
): number {
  if (!image) return 0;
  const scale = Math.min(opts.maxW / image.width, opts.maxH / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  page.drawImage(image, { x: opts.right - w, y: opts.centerY - h / 2, width: w, height: h });
  return w;
}
