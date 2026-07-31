import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createHash } from "crypto";
import { embedLogo, drawLogoRight } from "./logo";

export interface PlacedField {
  id: string;
  type: string;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ResolvedValue {
  text?: string; // for text / auto fields
  signaturePng?: string; // data URL for signature/initials
}

export interface CertificateInfo {
  envelopeId: string;
  documentTitle: string;
  signerName: string;
  signerEmail: string;
  companyName: string;
  companyLogo?: string | null;
  signerIp: string;
  createdAt: Date;
  viewedAt: Date | null;
  signedAt: Date;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  return Uint8Array.from(Buffer.from(base64, "base64"));
}

function fmt(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

/**
 * Burn the resolved field values + signatures into the PDF, hash the signed
 * content, then append a Certificate of Completion page referencing that hash.
 */
export async function generateSignedPdf(params: {
  originalDataUrl: string;
  fields: PlacedField[];
  values: Record<string, ResolvedValue>;
  cert: CertificateInfo;
}): Promise<{ pdfBase64: string; hash: string }> {
  const { originalDataUrl, fields, values, cert } = params;

  const pdf = await PDFDocument.load(dataUrlToBytes(originalDataUrl));
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = pdf.getPages();

  for (const f of fields) {
    const page = pages[f.page];
    if (!page) continue;
    const pw = page.getWidth();
    const ph = page.getHeight();

    const boxX = f.x * pw;
    const boxY = ph - (f.y + f.h) * ph; // bottom-left of the box
    const boxW = f.w * pw;
    const boxH = f.h * ph;

    const val = values[f.id];
    if (!val) continue;

    if (val.signaturePng) {
      try {
        const png = await pdf.embedPng(dataUrlToBytes(val.signaturePng));
        const scale = Math.min(boxW / png.width, boxH / png.height);
        const dw = png.width * scale;
        const dh = png.height * scale;
        page.drawImage(png, {
          x: boxX + (boxW - dw) / 2,
          y: boxY + (boxH - dh) / 2,
          width: dw,
          height: dh,
        });
      } catch {
        // ignore bad image
      }
    } else if (val.text) {
      const size = Math.min(boxH * 0.7, 12);
      page.drawText(val.text, {
        x: boxX + 2,
        y: boxY + boxH / 2 - size / 2,
        size,
        font,
        color: rgb(0.06, 0.09, 0.16),
      });
    }
  }

  // Hash the signed document (before the certificate is appended).
  const signedBytes = await pdf.save();
  const hash = createHash("sha256").update(signedBytes).digest("hex");

  // ── Certificate of Completion page ─────────────────────────────
  const cp = pdf.addPage([612, 792]);
  const margin = 56;
  let y = 792 - margin;

  const line = (
    text: string,
    opts: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {},
  ) => {
    const size = opts.size ?? 11;
    cp.drawText(text, {
      x: margin,
      y,
      size,
      font: opts.bold ? fontBold : font,
      color: rgb(...(opts.color ?? [0.1, 0.12, 0.18])),
    });
    y -= (opts.gap ?? size + 8);
  };

  cp.drawRectangle({ x: 0, y: 792 - 8, width: 612, height: 8, color: rgb(0.145, 0.388, 0.921) });
  const certLogo = await embedLogo(pdf, cert.companyLogo);
  drawLogoRight(cp, certLogo, { right: 612 - margin, centerY: y - 6, maxW: 120, maxH: 40 });
  line("Certificate of Completion", { size: 22, bold: true, gap: 34 });
  line("This certifies the electronic signing of the document below.", {
    size: 10,
    color: [0.4, 0.45, 0.5],
    gap: 26,
  });

  const field = (label: string, value: string) => {
    cp.drawText(label, { x: margin, y, size: 9, font: fontBold, color: rgb(0.45, 0.5, 0.55) });
    y -= 14;
    cp.drawText(value, { x: margin, y, size: 12, font, color: rgb(0.1, 0.12, 0.18) });
    y -= 24;
  };

  field("Envelope ID", cert.envelopeId);
  field("Document", cert.documentTitle);
  field("Company", cert.companyName);
  field("Signer", `${cert.signerName}  <${cert.signerEmail}>`);

  y -= 6;
  line("Audit trail", { size: 13, bold: true, gap: 20 });
  field("Sent", fmt(cert.createdAt));
  field("First viewed", fmt(cert.viewedAt));
  field("Signed", fmt(cert.signedAt));
  field("Signer IP address", cert.signerIp || "unknown");

  y -= 6;
  line("Document integrity (SHA-256)", { size: 13, bold: true, gap: 18 });
  // hash split across two lines for width
  cp.drawText(hash.slice(0, 64), { x: margin, y, size: 9, font, color: rgb(0.3, 0.35, 0.4) });
  y -= 24;

  cp.drawText(
    "Any modification to the signed document will change this hash and invalidate the certificate.",
    { x: margin, y, size: 8, font, color: rgb(0.5, 0.55, 0.6) },
  );

  const finalBytes = await pdf.save();
  const pdfBase64 = `data:application/pdf;base64,${Buffer.from(finalBytes).toString("base64")}`;
  return { pdfBase64, hash };
}
