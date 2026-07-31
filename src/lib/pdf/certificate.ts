import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { createHash } from "crypto";
import { embedLogo } from "./logo";

export interface CertSigner {
  label: string;
  name: string;
  at: string;
  ip: string;
}

const ACCENT = rgb(0.145, 0.388, 0.921);
const DARK = rgb(0.11, 0.15, 0.23);
const GRAY = rgb(0.45, 0.5, 0.57);
const LIGHT = rgb(0.975, 0.98, 0.99);
const BORDER = rgb(0.88, 0.9, 0.94);
const GREEN = rgb(0.09, 0.6, 0.35);
const GREEN_BG = rgb(0.88, 0.96, 0.91);
const WHITE = rgb(1, 1, 1);

/**
 * Append a polished "Certificate of Completion" page: hashes the current
 * document bytes (before the certificate) and prints the audit trail + hash.
 */
export async function appendCertificate(
  pdf: PDFDocument,
  font: PDFFont,
  bold: PDFFont,
  opts: { envelopeId: string; documentTitle: string; signers: CertSigner[]; logo?: string | null },
): Promise<void> {
  const preBytes = await pdf.save();
  const hash = createHash("sha256").update(preBytes).digest("hex");
  const mono = await pdf.embedFont(StandardFonts.Courier);

  const W = 612, H = 792, margin = 48, contentW = W - margin * 2;
  const page = pdf.addPage([W, H]);

  // ── Decorative frame (subtle, certificate-like) ──
  page.drawRectangle({ x: 24, y: 24, width: W - 48, height: H - 48, borderColor: BORDER, borderWidth: 1 });
  // Thin brand accent bar along the very top of the frame
  page.drawRectangle({ x: 24, y: H - 30, width: W - 48, height: 6, color: ACCENT });

  const logoImg = await embedLogo(pdf, opts.logo);

  // ── Header row: logo (left, on white → clearly visible) + verified seal ──
  const rowCy = H - 66;
  if (logoImg) {
    const maxW = 210, maxH = 50;
    const s = Math.min(maxW / logoImg.width, maxH / logoImg.height);
    page.drawImage(logoImg, {
      x: margin,
      y: rowCy - (logoImg.height * s) / 2,
      width: logoImg.width * s,
      height: logoImg.height * s,
    });
  }
  // Verified seal (green check) at far right
  const cx = W - margin - 15, cy = rowCy;
  page.drawCircle({ x: cx, y: cy, size: 15, color: GREEN });
  page.drawLine({ start: { x: cx - 6.5, y: cy + 0.5 }, end: { x: cx - 1.5, y: cy - 5 }, thickness: 2.4, color: WHITE });
  page.drawLine({ start: { x: cx - 1.5, y: cy - 5 }, end: { x: cx + 7, y: cy + 6.5 }, thickness: 2.4, color: WHITE });
  // "VERIFIED" pill to the left of the seal
  const tag = "VERIFIED";
  const tagW = bold.widthOfTextAtSize(tag, 8) + 16;
  page.drawRectangle({ x: cx - 15 - 8 - tagW, y: cy - 7, width: tagW, height: 15, color: GREEN_BG });
  page.drawText(tag, { x: cx - 15 - 8 - tagW + 8, y: cy - 3, size: 8, font: bold, color: GREEN });

  // ── Title ──
  let y = H - 118;
  page.drawText("Certificate of Completion", { x: margin, y, size: 25, font: bold, color: DARK });
  y -= 18;
  page.drawText("Audit trail & document integrity", { x: margin, y, size: 11, font, color: GRAY });
  y -= 18;
  page.drawLine({ start: { x: margin, y }, end: { x: W - margin, y }, thickness: 1, color: BORDER });
  y -= 30;

  // ── Meta ──
  const kv = (label: string, value: string) => {
    page.drawText(label.toUpperCase(), { x: margin, y, size: 8, font: bold, color: GRAY });
    y -= 16;
    page.drawText(value || "—", { x: margin, y, size: 12, font, color: DARK });
    y -= 28;
  };
  kv("Envelope ID", opts.envelopeId);
  kv("Document", opts.documentTitle);

  // ── Signers ──
  y -= 2;
  page.drawText("Signers", { x: margin, y, size: 14, font: bold, color: DARK });
  y -= 16;
  for (const s of opts.signers) {
    const cardH = 56;
    const top = y;
    page.drawRectangle({ x: margin, y: top - cardH + 12, width: contentW, height: cardH, color: LIGHT, borderColor: BORDER, borderWidth: 1 });
    // left accent stripe
    page.drawRectangle({ x: margin, y: top - cardH + 12, width: 3.5, height: cardH, color: ACCENT });
    page.drawText(s.label.toUpperCase(), { x: margin + 16, y: top - 4, size: 8, font: bold, color: ACCENT });
    page.drawText(s.name || "—", { x: margin + 16, y: top - 21, size: 12.5, font: bold, color: DARK });
    page.drawText(`Signed ${s.at}    ·    IP ${s.ip}`, { x: margin + 16, y: top - 35, size: 9, font, color: GRAY });
    y -= cardH + 10;
  }

  // ── Integrity hash ──
  y -= 8;
  page.drawText("Document integrity (SHA-256)", { x: margin, y, size: 12, font: bold, color: DARK });
  y -= 22;
  page.drawRectangle({ x: margin, y: y - 22, width: contentW, height: 32, color: rgb(0.965, 0.975, 0.99), borderColor: BORDER, borderWidth: 1 });
  page.drawText(hash, { x: margin + 12, y: y - 8, size: 8.4, font: mono, color: rgb(0.3, 0.35, 0.42) });
  y -= 42;
  page.drawText("Any modification to the signed record changes this hash and invalidates the certificate.", {
    x: margin, y, size: 8, font, color: GRAY,
  });

  // ── Footer ──
  page.drawLine({ start: { x: margin, y: 44 }, end: { x: W - margin, y: 44 }, thickness: 0.5, color: BORDER });
  page.drawText("Prime Fleet — Electronic Records", { x: margin, y: 33, size: 8, font, color: GRAY });
  const seal = "Certified electronically";
  page.drawText(seal, { x: W - margin - font.widthOfTextAtSize(seal, 8), y: 33, size: 8, font, color: GRAY });
}
