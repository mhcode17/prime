import "server-only";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import { createHash } from "crypto";

export interface CertSigner {
  label: string; // e.g. "Applicant (consent)"
  name: string;
  at: string; // formatted timestamp
  ip: string;
}

/**
 * Append a DocuSign-style "Certificate of Completion" page: hashes the current
 * document bytes (before the certificate) and prints the audit trail + hash.
 * The caller saves the PDFDocument afterwards.
 */
export async function appendCertificate(
  pdf: PDFDocument,
  font: PDFFont,
  bold: PDFFont,
  opts: { envelopeId: string; documentTitle: string; signers: CertSigner[] },
): Promise<void> {
  const preBytes = await pdf.save();
  const hash = createHash("sha256").update(preBytes).digest("hex");

  const margin = 56;
  const page = pdf.addPage([612, 792]);
  const dark = rgb(0.1, 0.12, 0.18);
  const gray = rgb(0.45, 0.5, 0.55);
  let y = 792 - margin;

  page.drawRectangle({ x: 0, y: 792 - 8, width: 612, height: 8, color: rgb(0.145, 0.388, 0.921) });
  page.drawText("Certificate of Completion", { x: margin, y, size: 22, font: bold, color: dark });
  y -= 34;
  page.drawText("Audit trail and document integrity for the record below.", {
    x: margin, y, size: 10, font, color: gray,
  });
  y -= 28;

  const field = (label: string, value: string) => {
    page.drawText(label.toUpperCase(), { x: margin, y, size: 9, font: bold, color: gray });
    y -= 14;
    page.drawText(value || "—", { x: margin, y, size: 12, font, color: dark });
    y -= 24;
  };

  field("Envelope ID", opts.envelopeId);
  field("Document", opts.documentTitle);

  y -= 6;
  page.drawText("Signers", { x: margin, y, size: 13, font: bold, color: dark });
  y -= 20;
  for (const s of opts.signers) {
    page.drawText(s.label, { x: margin, y, size: 9, font: bold, color: gray });
    y -= 14;
    page.drawText(s.name || "—", { x: margin, y, size: 12, font, color: dark });
    y -= 15;
    page.drawText(`Timestamp: ${s.at}   ·   IP: ${s.ip}`, { x: margin, y, size: 9, font, color: gray });
    y -= 24;
  }

  y -= 6;
  page.drawText("Document integrity (SHA-256)", { x: margin, y, size: 13, font: bold, color: dark });
  y -= 18;
  page.drawText(hash.slice(0, 64), { x: margin, y, size: 9, font, color: rgb(0.3, 0.35, 0.4) });
  y -= 22;
  page.drawText(
    "Any modification to the signed record changes this hash and invalidates the certificate.",
    { x: margin, y, size: 8, font, color: gray },
  );
}
