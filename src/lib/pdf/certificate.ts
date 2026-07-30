import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { createHash } from "crypto";

export interface CertSigner {
  label: string;
  name: string;
  at: string;
  ip: string;
}

const NAVY = rgb(0.1, 0.14, 0.25);
const ACCENT = rgb(0.145, 0.388, 0.921);
const DARK = rgb(0.11, 0.15, 0.23);
const GRAY = rgb(0.45, 0.5, 0.57);
const LIGHT = rgb(0.97, 0.98, 0.99);
const BORDER = rgb(0.88, 0.9, 0.94);
const GREEN = rgb(0.09, 0.6, 0.35);
const WHITE = rgb(1, 1, 1);

/**
 * Append a polished "Certificate of Completion" page: hashes the current
 * document bytes (before the certificate) and prints the audit trail + hash.
 */
export async function appendCertificate(
  pdf: PDFDocument,
  font: PDFFont,
  bold: PDFFont,
  opts: { envelopeId: string; documentTitle: string; signers: CertSigner[] },
): Promise<void> {
  const preBytes = await pdf.save();
  const hash = createHash("sha256").update(preBytes).digest("hex");
  const mono = await pdf.embedFont(StandardFonts.Courier);

  const W = 612, H = 792, margin = 48, contentW = W - margin * 2;
  const page = pdf.addPage([W, H]);

  // Header band + verified seal
  page.drawRectangle({ x: 0, y: H - 104, width: W, height: 104, color: NAVY });
  page.drawRectangle({ x: 0, y: H - 107, width: W, height: 3, color: ACCENT });
  page.drawText("Certificate of Completion", { x: margin, y: H - 56, size: 22, font: bold, color: WHITE });
  page.drawText("Audit trail & document integrity", { x: margin, y: H - 78, size: 11, font, color: rgb(0.72, 0.78, 0.88) });
  const cx = W - margin - 18, cy = H - 54;
  page.drawCircle({ x: cx, y: cy, size: 16, color: GREEN });
  page.drawLine({ start: { x: cx - 7, y: cy + 1 }, end: { x: cx - 2, y: cy - 5 }, thickness: 2.2, color: WHITE });
  page.drawLine({ start: { x: cx - 2, y: cy - 5 }, end: { x: cx + 8, y: cy + 7 }, thickness: 2.2, color: WHITE });

  let y = H - 104 - 40;
  const kv = (label: string, value: string) => {
    page.drawText(label.toUpperCase(), { x: margin, y, size: 8, font: bold, color: GRAY });
    y -= 15;
    page.drawText(value || "—", { x: margin, y, size: 12, font, color: DARK });
    y -= 26;
  };
  kv("Envelope ID", opts.envelopeId);
  kv("Document", opts.documentTitle);

  y -= 4;
  page.drawText("Signers", { x: margin, y, size: 14, font: bold, color: DARK });
  y -= 12;
  for (const s of opts.signers) {
    const cardH = 54;
    page.drawRectangle({ x: margin, y: y - cardH + 12, width: contentW, height: cardH, color: LIGHT, borderColor: BORDER, borderWidth: 1 });
    page.drawText(s.label.toUpperCase(), { x: margin + 14, y: y - 4, size: 8, font: bold, color: ACCENT });
    page.drawText(s.name || "—", { x: margin + 14, y: y - 20, size: 12, font: bold, color: DARK });
    page.drawText(`Signed ${s.at}   ·   IP ${s.ip}`, { x: margin + 14, y: y - 34, size: 9, font, color: GRAY });
    y -= cardH + 10;
  }

  y -= 8;
  page.drawText("Document integrity (SHA-256)", { x: margin, y, size: 12, font: bold, color: DARK });
  y -= 20;
  page.drawRectangle({ x: margin, y: y - 22, width: contentW, height: 30, color: rgb(0.96, 0.97, 0.99), borderColor: BORDER, borderWidth: 1 });
  page.drawText(hash, { x: margin + 12, y: y - 8, size: 8.4, font: mono, color: rgb(0.3, 0.35, 0.42) });
  y -= 40;
  page.drawText("Any modification to the signed record changes this hash and invalidates the certificate.", {
    x: margin, y, size: 8, font, color: GRAY,
  });

  // footer
  page.drawLine({ start: { x: margin, y: 40 }, end: { x: W - margin, y: 40 }, thickness: 0.5, color: BORDER });
  page.drawText("Prime Fleet — Employment Verification", { x: margin, y: 28, size: 8, font, color: GRAY });
}
