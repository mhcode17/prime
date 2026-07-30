import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";

export interface VerificationPdfData {
  applicantName: string;
  employerName: string;
  companyName: string;
  position: string;
  datesStated: string;

  // Driver's consent
  consentSignature: string | null;
  consentSignedAt: Date | null;
  consentIp: string | null;

  // Prior employer's response
  confirmedStartDate: Date | null;
  confirmedEndDate: Date | null;
  eligibleForRehire: boolean | null;
  drugAlcoholViolation: boolean | null;
  dotRecordableAccident: boolean | null;
  dotAccidentDetails: string | null;
  comments: string | null;
  responderName: string | null;
  responderTitle: string | null;
  responderSignature: string | null;
  respondedAt: Date | null;
  responderIp: string | null;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  return Uint8Array.from(Buffer.from(base64, "base64"));
}
function fmt(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short",
  });
}
function fmtDay(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function tri(v: boolean | null): string {
  return v === true ? "Yes" : v === false ? "No" : "Unknown";
}

export async function generateVerificationPdf(d: VerificationPdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 56;
  const pageW = 612, pageH = 792;
  const width = pageW - margin * 2;
  const dark = rgb(0.06, 0.09, 0.16);
  const gray = rgb(0.42, 0.47, 0.53);
  const accent = rgb(0.145, 0.388, 0.921);

  let page: PDFPage = pdf.addPage([pageW, pageH]);
  let y = pageH - margin;

  const ensure = (space: number) => {
    if (y - space < margin) {
      page = pdf.addPage([pageW, pageH]);
      y = pageH - margin;
    }
  };
  const line = (
    text: string,
    opts: { size?: number; f?: PDFFont; color?: ReturnType<typeof rgb>; gap?: number } = {},
  ) => {
    const size = opts.size ?? 11;
    ensure(size + 6);
    page.drawText(text, { x: margin, y, size, font: opts.f ?? font, color: opts.color ?? dark });
    y -= opts.gap ?? size + 8;
  };
  const field = (label: string, value: string) => {
    ensure(38);
    page.drawText(label.toUpperCase(), { x: margin, y, size: 8, font: bold, color: gray });
    y -= 14;
    page.drawText(value || "—", { x: margin, y, size: 12, font, color: dark });
    y -= 22;
  };
  const wrapped = (text: string, size = 11) => {
    const words = text.split(" ");
    let l = "";
    for (const w of words) {
      const t = l ? `${l} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) > width) {
        line(l, { size, gap: size + 4 });
        l = w;
      } else l = t;
    }
    if (l) line(l, { size, gap: size + 4 });
  };
  const sectionTitle = (t: string) => {
    ensure(30);
    y -= 6;
    page.drawRectangle({ x: margin, y: y - 2, width, height: 22, color: rgb(0.94, 0.96, 1) });
    page.drawText(t, { x: margin + 6, y: y + 4, size: 12, font: bold, color: accent });
    y -= 30;
  };
  const signatureBox = async (dataUrl: string | null, caption: string) => {
    ensure(94);
    const boxY = y - 70;
    page.drawRectangle({ x: margin, y: boxY, width: 260, height: 70, borderColor: rgb(0.8, 0.83, 0.86), borderWidth: 1 });
    if (dataUrl && dataUrl.startsWith("data:image")) {
      try {
        const png = await pdf.embedPng(dataUrlToBytes(dataUrl));
        const scale = Math.min(250 / png.width, 60 / png.height);
        page.drawImage(png, {
          x: margin + (260 - png.width * scale) / 2,
          y: boxY + (70 - png.height * scale) / 2,
          width: png.width * scale, height: png.height * scale,
        });
      } catch { /* ignore */ }
    }
    y = boxY - 14;
    page.drawText(caption, { x: margin, y, size: 9, font, color: gray });
    y -= 18;
  };

  // Header
  page.drawRectangle({ x: 0, y: pageH - 8, width: pageW, height: 8, color: accent });
  line("Employment Verification", { size: 20, f: bold, gap: 24 });
  line("Completed verification record — DOT / FMCSA", { size: 11, color: gray, gap: 26 });

  // Applicant / request
  field("Applicant", d.applicantName);
  field("Prior employer", d.employerName);
  field("Position", d.position);
  field("Dates stated by applicant", d.datesStated);
  field("Releasing to (hiring company)", d.companyName);

  // Consent section
  sectionTitle("1. Applicant authorization (consent)");
  wrapped(
    `I, ${d.applicantName}, authorize ${d.employerName} to release to ${d.companyName} all information ` +
    `regarding my employment, including job performance, dates of employment, reason for leaving, ` +
    `eligibility for rehire, DOT drug & alcohol testing history, and any DOT-recordable accidents, for ` +
    `the purpose of employment verification. I release all parties from any liability for providing this information.`,
  );
  y -= 6;
  await signatureBox(d.consentSignature, `Applicant signature — signed ${fmt(d.consentSignedAt)} · IP ${d.consentIp ?? "unknown"}`);

  // Employer response section
  sectionTitle("2. Prior employer's response");
  field(
    "Confirmed employment dates",
    d.confirmedStartDate ? `${fmtDay(d.confirmedStartDate)} — ${d.confirmedEndDate ? fmtDay(d.confirmedEndDate) : "Present"}` : "—",
  );
  field("Eligible for rehire", tri(d.eligibleForRehire));
  field("Drug & alcohol program violation or refusal (DOT)", tri(d.drugAlcoholViolation));
  field("DOT-recordable accident during employment", tri(d.dotRecordableAccident));
  if (d.dotRecordableAccident === true && d.dotAccidentDetails) {
    line("Accident details:", { size: 8, f: bold, color: gray, gap: 14 });
    wrapped(d.dotAccidentDetails, 11);
    y -= 4;
  }
  if (d.comments) {
    line("Comments:", { size: 8, f: bold, color: gray, gap: 14 });
    wrapped(d.comments, 11);
    y -= 4;
  }
  field("Responded by", `${d.responderName ?? "—"}${d.responderTitle ? ` (${d.responderTitle})` : ""}`);
  await signatureBox(d.responderSignature, `Prior employer signature — responded ${fmt(d.respondedAt)} · IP ${d.responderIp ?? "unknown"}`);

  // Footer note
  ensure(20);
  page.drawText(
    "This verification was completed electronically. Both signatures were captured with timestamps and IP addresses.",
    { x: margin, y: margin - 10 < y ? margin : y, size: 8, font, color: gray },
  );

  return pdf.save();
}
