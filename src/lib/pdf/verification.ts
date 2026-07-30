import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { appendCertificate } from "./certificate";

export interface VerificationPdfData {
  envelopeId: string;
  applicantName: string;
  employerName: string;
  companyName: string;
  position: string;
  datesStated: string;

  consentSignature: string | null;
  consentSignedAt: Date | null;
  consentIp: string | null;

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

const NAVY = rgb(0.1, 0.14, 0.25);
const ACCENT = rgb(0.145, 0.388, 0.921);
const DARK = rgb(0.11, 0.15, 0.23);
const GRAY = rgb(0.45, 0.5, 0.57);
const LIGHT = rgb(0.975, 0.98, 0.99);
const BORDER = rgb(0.88, 0.9, 0.94);
const WHITE = rgb(1, 1, 1);
const GREEN = rgb(0.06, 0.5, 0.3);
const GREEN_BG = rgb(0.87, 0.96, 0.91);
const RED = rgb(0.8, 0.13, 0.13);
const RED_BG = rgb(0.99, 0.9, 0.9);
const GRAY_BG = rgb(0.93, 0.95, 0.97);

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  return Uint8Array.from(Buffer.from(base64, "base64"));
}
function fmt(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });
}
function fmtDay(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export async function generateVerificationPdf(d: VerificationPdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const W = 612, H = 792, margin = 48, contentW = W - margin * 2;
  let page: PDFPage = pdf.addPage([W, H]);
  let y = 0;

  const newPage = () => {
    page = pdf.addPage([W, H]);
    y = H - margin;
  };
  const ensure = (space: number) => {
    if (y - space < 60) newPage();
  };

  // wrap helper
  const wrapLines = (text: string, size: number, maxW: number, f: PDFFont = font): string[] => {
    const out: string[] = [];
    for (const para of text.split("\n")) {
      let line = "";
      for (const w of para.split(" ")) {
        const t = line ? `${line} ${w}` : w;
        if (f.widthOfTextAtSize(t, size) > maxW) {
          if (line) out.push(line);
          line = w;
        } else line = t;
      }
      out.push(line);
    }
    return out;
  };

  // ── Header band ─────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: H - 96, width: W, height: 96, color: NAVY });
  page.drawRectangle({ x: 0, y: H - 99, width: W, height: 3, color: ACCENT });
  page.drawText("Employment Verification", { x: margin, y: H - 50, size: 22, font: bold, color: WHITE });
  page.drawText("Completed verification record  ·  DOT / FMCSA", { x: margin, y: H - 72, size: 11, font, color: rgb(0.72, 0.78, 0.88) });
  // status chip (right)
  const chip = "COMPLETED";
  const chipW = bold.widthOfTextAtSize(chip, 9) + 20;
  page.drawRectangle({ x: W - margin - chipW, y: H - 58, width: chipW, height: 20, color: GREEN_BG });
  page.drawText(chip, { x: W - margin - chipW + 10, y: H - 52, size: 9, font: bold, color: GREEN });

  y = H - 96 - 26;

  // ── Applicant summary card ──────────────────────────────────
  const kvAt = (x: number, top: number, label: string, value: string) => {
    page.drawText(label.toUpperCase(), { x, y: top, size: 7.5, font: bold, color: GRAY });
    page.drawText(value || "—", { x, y: top - 14, size: 12, font, color: DARK });
  };
  const rows: [string, string, string, string][] = [
    ["Applicant", d.applicantName, "Position", d.position || "—"],
    ["Prior employer", d.employerName, "Dates stated by applicant", d.datesStated],
    ["Releasing to (hiring company)", d.companyName, "", ""],
  ];
  const cardH = rows.length * 38 + 12;
  page.drawRectangle({ x: margin, y: y - cardH, width: contentW, height: cardH, color: LIGHT, borderColor: BORDER, borderWidth: 1 });
  let ry = y - 24;
  for (const [l1, v1, l2, v2] of rows) {
    kvAt(margin + 16, ry, l1, v1);
    if (l2) kvAt(margin + 268, ry, l2, v2);
    ry -= 38;
  }
  y = y - cardH - 26;

  // ── Section band ────────────────────────────────────────────
  const section = (num: number, title: string) => {
    ensure(40);
    page.drawRectangle({ x: margin, y: y - 6, width: contentW, height: 26, color: rgb(0.93, 0.95, 1) });
    page.drawRectangle({ x: margin, y: y - 6, width: 26, height: 26, color: ACCENT });
    page.drawText(String(num), { x: margin + 9, y: y + 2, size: 13, font: bold, color: WHITE });
    page.drawText(title, { x: margin + 38, y: y + 2, size: 12, font: bold, color: ACCENT });
    y -= 40;
  };

  const label = (t: string) => {
    ensure(20);
    page.drawText(t.toUpperCase(), { x: margin, y, size: 7.5, font: bold, color: GRAY });
    y -= 15;
  };
  const value = (t: string, size = 12) => {
    ensure(size + 8);
    page.drawText(t || "—", { x: margin, y, size, font, color: DARK });
    y -= size + 12;
  };
  const paragraph = (t: string, size = 11) => {
    for (const ln of wrapLines(t, size, contentW - 24)) {
      ensure(size + 5);
      page.drawText(ln, { x: margin, y, size, font, color: DARK });
      y -= size + 4;
    }
  };
  const pill = (x: number, top: number, text: string, tone: "green" | "red" | "gray") => {
    const bg = tone === "green" ? GREEN_BG : tone === "red" ? RED_BG : GRAY_BG;
    const fg = tone === "green" ? GREEN : tone === "red" ? RED : GRAY;
    const w = bold.widthOfTextAtSize(text, 9) + 18;
    page.drawRectangle({ x, y: top - 5, width: w, height: 18, color: bg });
    page.drawText(text, { x: x + 9, y: top, size: 9, font: bold, color: fg });
  };
  const answer = (lbl: string, val: boolean | null, goodWhen: boolean) => {
    ensure(24);
    page.drawText(lbl, { x: margin, y, size: 10.5, font, color: DARK });
    const text = val === true ? "Yes" : val === false ? "No" : "Unknown";
    const tone = val === null ? "gray" : val === goodWhen ? "green" : "red";
    pill(margin + 340, y - 1, text, tone);
    y -= 24;
  };
  const signature = async (dataUrl: string | null, caption: string) => {
    ensure(96);
    const bw = 240, bh = 64, by = y - bh;
    page.drawRectangle({ x: margin, y: by, width: bw, height: bh, color: rgb(0.995, 0.995, 1), borderColor: BORDER, borderWidth: 1 });
    if (dataUrl && dataUrl.startsWith("data:image")) {
      try {
        const png = await pdf.embedPng(dataUrlToBytes(dataUrl));
        const scale = Math.min((bw - 20) / png.width, (bh - 12) / png.height);
        page.drawImage(png, {
          x: margin + (bw - png.width * scale) / 2,
          y: by + (bh - png.height * scale) / 2,
          width: png.width * scale, height: png.height * scale,
        });
      } catch { /* ignore */ }
    }
    y = by - 14;
    page.drawText(caption, { x: margin, y, size: 9, font, color: GRAY });
    y -= 18;
  };

  // ── Section 1: consent ──────────────────────────────────────
  section(1, "Applicant Authorization (Consent)");
  paragraph(
    `I, ${d.applicantName}, authorize ${d.employerName} to release to ${d.companyName} all information ` +
    `regarding my employment, including job performance, dates of employment, reason for leaving, eligibility ` +
    `for rehire, DOT drug & alcohol testing history, and any DOT-recordable accidents, for the purpose of ` +
    `employment verification. I release all parties from any liability for providing this information.`,
  );
  y -= 8;
  await signature(
    d.consentSignature,
    `Applicant signature — signed ${fmt(d.consentSignedAt)}  ·  IP ${d.consentIp ?? "unknown"}`,
  );

  // ── Section 2: employer response ────────────────────────────
  y -= 6;
  section(2, "Prior Employer's Response");
  label("Confirmed employment dates");
  value(
    d.confirmedStartDate
      ? `${fmtDay(d.confirmedStartDate)} — ${d.confirmedEndDate ? fmtDay(d.confirmedEndDate) : "Present"}`
      : "—",
    14,
  );
  y -= 4;
  answer("Eligible for rehire", d.eligibleForRehire, true);
  answer("Drug & alcohol program violation or refusal (DOT)", d.drugAlcoholViolation, false);
  answer("DOT-recordable accident during employment", d.dotRecordableAccident, false);

  if (d.dotRecordableAccident === true && d.dotAccidentDetails) {
    y -= 6;
    label("Accident details");
    paragraph(d.dotAccidentDetails);
  }
  if (d.comments) {
    y -= 6;
    label("Comments");
    paragraph(d.comments);
  }

  y -= 8;
  label("Responded by");
  value(`${d.responderName ?? "—"}${d.responderTitle ? `  (${d.responderTitle})` : ""}`);
  y -= 4;
  await signature(
    d.responderSignature,
    `Prior employer signature — responded ${fmt(d.respondedAt)}  ·  IP ${d.responderIp ?? "unknown"}`,
  );

  // ── Footers on content pages (before hashing) ───────────────
  const genStr = `Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`;
  for (const p of pdf.getPages()) {
    p.drawLine({ start: { x: margin, y: 40 }, end: { x: W - margin, y: 40 }, thickness: 0.5, color: BORDER });
    p.drawText("Prime Fleet — Employment Verification", { x: margin, y: 28, size: 8, font, color: GRAY });
    const gw = font.widthOfTextAtSize(genStr, 8);
    p.drawText(genStr, { x: W - margin - gw, y: 28, size: 8, font, color: GRAY });
  }

  // ── Certificate of Completion ───────────────────────────────
  await appendCertificate(pdf, font, bold, {
    envelopeId: d.envelopeId,
    documentTitle: `Employment Verification — ${d.applicantName} @ ${d.employerName}`,
    signers: [
      { label: "Applicant (consent)", name: d.applicantName, at: fmt(d.consentSignedAt), ip: d.consentIp ?? "unknown" },
      {
        label: "Prior employer (response)",
        name: `${d.responderName ?? "—"}${d.responderTitle ? ` (${d.responderTitle})` : ""}`,
        at: fmt(d.respondedAt),
        ip: d.responderIp ?? "unknown",
      },
    ],
  });

  return pdf.save();
}
