import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { appendCertificate } from "./certificate";
import { embedLogo, drawLogoRight } from "./logo";

export interface ConsentPdfData {
  envelopeId: string;
  applicantName: string;
  employerName: string;
  companyName: string;
  companyLogo?: string | null;
  position: string;
  datesStated: string;
  signaturePng: string | null; // data URL
  signedAt: Date | null;
  signerIp: string | null;
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

/** Build a standalone "Authorization to Release Information" PDF. */
export async function generateConsentPdf(d: ConsentPdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 56;
  const width = 612 - margin * 2;
  let y = 792 - margin;

  const dark = rgb(0.06, 0.09, 0.16);
  const gray = rgb(0.42, 0.47, 0.53);

  // Header bar
  page.drawRectangle({ x: 0, y: 792 - 8, width: 612, height: 8, color: rgb(0.145, 0.388, 0.921) });

  page.drawText("Authorization to Release Information", { x: margin, y, size: 20, font: bold, color: dark });
  const cLogo = await embedLogo(pdf, d.companyLogo);
  drawLogoRight(page, cLogo, { right: 612 - margin, centerY: y + 4, maxW: 120, maxH: 40 });
  y -= 24;
  page.drawText("Employment Verification — DOT / FMCSA", { x: margin, y, size: 11, font, color: gray });
  y -= 30;

  const field = (label: string, value: string) => {
    page.drawText(label.toUpperCase(), { x: margin, y, size: 8, font: bold, color: gray });
    y -= 14;
    page.drawText(value || "—", { x: margin, y, size: 12, font, color: dark });
    y -= 22;
  };

  field("Applicant", d.applicantName);
  field("Prior employer", d.employerName);
  field("Position", d.position);
  field("Dates stated by applicant", d.datesStated);
  field("Releasing to (hiring company)", d.companyName);

  y -= 6;
  page.drawText("Authorization", { x: margin, y, size: 13, font: bold, color: dark });
  y -= 18;

  const consent =
    `I, ${d.applicantName}, authorize ${d.employerName} to release to ${d.companyName} all ` +
    `information regarding my employment, including job performance, dates of employment, reason ` +
    `for leaving, eligibility for rehire, DOT drug & alcohol testing history, and any DOT-recordable ` +
    `accidents, for the purpose of employment verification. I release all parties from any liability ` +
    `for providing this information.`;

  // simple word-wrap
  const words = consent.split(" ");
  let line = "";
  const size = 11;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > width) {
      page.drawText(line, { x: margin, y, size, font, color: dark });
      y -= 16;
      line = w;
    } else {
      line = test;
    }
  }
  if (line) {
    page.drawText(line, { x: margin, y, size, font, color: dark });
    y -= 16;
  }

  y -= 20;
  page.drawText("Signature", { x: margin, y, size: 8, font: bold, color: gray });
  y -= 6;
  // signature box
  const boxY = y - 70;
  page.drawRectangle({ x: margin, y: boxY, width: 260, height: 70, borderColor: rgb(0.8, 0.83, 0.86), borderWidth: 1 });
  if (d.signaturePng && d.signaturePng.startsWith("data:image")) {
    try {
      const png = await pdf.embedPng(dataUrlToBytes(d.signaturePng));
      const scale = Math.min(250 / png.width, 60 / png.height);
      page.drawImage(png, {
        x: margin + (260 - png.width * scale) / 2,
        y: boxY + (70 - png.height * scale) / 2,
        width: png.width * scale,
        height: png.height * scale,
      });
    } catch {
      // ignore
    }
  }
  y = boxY - 18;
  page.drawText(`Signed: ${fmt(d.signedAt)}`, { x: margin, y, size: 10, font, color: dark });
  y -= 14;
  page.drawText(`Signer IP: ${d.signerIp ?? "unknown"}`, { x: margin, y, size: 9, font, color: gray });

  // footer
  page.drawText(
    "This authorization was completed electronically and is legally binding.",
    { x: margin, y: margin, size: 8, font, color: gray },
  );

  // Certificate of Completion (audit trail + hash)
  await appendCertificate(pdf, font, bold, {
    envelopeId: d.envelopeId,
    documentTitle: `Authorization to Release Information — ${d.applicantName} @ ${d.employerName}`,
    logo: d.companyLogo,
    signers: [
      {
        label: "Applicant",
        name: d.applicantName,
        at: fmt(d.signedAt),
        ip: d.signerIp ?? "unknown",
      },
    ],
  });

  return pdf.save();
}
