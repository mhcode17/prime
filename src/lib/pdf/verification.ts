import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { appendCertificate } from "./certificate";
import { embedLogo, drawLogoRight } from "./logo";
import { VEHICLE_TYPES, REASONS, CHARACTERISTICS, RATING_OPTIONS, DA_QUESTIONS, type Accident } from "../sph";

export interface VerificationPdfData {
  envelopeId: string;
  applicantName: string;
  employerName: string;
  companyName: string;
  companyLogo?: string | null;
  position: string;
  datesStated: string;

  consentSignature: string | null;
  consentSignedAt: Date | null;
  consentIp: string | null;

  // Part 2
  employedByUs: boolean | null;
  confirmedStartDate: Date | null;
  confirmedEndDate: Date | null;
  didDriveVehicle: boolean | null;
  vehicleTypes: string[];
  vehicleTypeOther: string | null;
  reasonForLeavingType: string | null;
  eligibleForRehire: boolean | null;
  noSafetyHistory: boolean | null;
  accidents: Accident[];
  otherAccidents: string | null;
  accidentRemarks: string | null;

  // Part 3
  noDrugAlcoholInfo: boolean | null;
  daAlcoholTest: boolean | null;
  daPositiveTest: boolean | null;
  daRefusals: boolean | null;
  daOtherViolations: boolean | null;
  daSapSubsequent: boolean | null;

  // Part 4
  ratings: Record<string, string>;

  // Response
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
const BORDER = rgb(0.85, 0.88, 0.92);
const WHITE = rgb(1, 1, 1);
const GREEN = rgb(0.06, 0.5, 0.3);
const GREEN_BG = rgb(0.87, 0.96, 0.91);
const RED = rgb(0.8, 0.13, 0.13);
const RED_BG = rgb(0.99, 0.9, 0.9);
const GRAY_BG = rgb(0.93, 0.95, 0.97);

function dataUrlToBytes(u: string): Uint8Array {
  const b64 = u.includes(",") ? u.split(",")[1] : u;
  return Uint8Array.from(Buffer.from(b64, "base64"));
}
function fmt(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
}
function fmtDay(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function triText(v: boolean | null): string {
  return v === true ? "Yes" : v === false ? "No" : "—";
}

export async function generateVerificationPdf(d: VerificationPdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 612, H = 792, margin = 48, contentW = W - margin * 2;
  let page: PDFPage = pdf.addPage([W, H]);
  let y = 0;

  const newPage = () => { page = pdf.addPage([W, H]); y = H - margin; };
  const ensure = (space: number) => { if (y - space < 52) newPage(); };
  const wrap = (t: string, size: number, maxW: number, f: PDFFont = font): string[] => {
    const out: string[] = [];
    for (const para of t.split("\n")) {
      let line = "";
      for (const w of para.split(" ")) {
        const test = line ? `${line} ${w}` : w;
        if (f.widthOfTextAtSize(test, size) > maxW) { if (line) out.push(line); line = w; } else line = test;
      }
      out.push(line);
    }
    return out;
  };
  const text = (str: string, x: number, size: number, f: PDFFont, color = DARK) =>
    page.drawText(str, { x, y, size, font: f, color });

  const section = (num: number, title: string) => {
    ensure(36);
    y -= 4;
    page.drawRectangle({ x: margin, y: y - 6, width: contentW, height: 25, color: rgb(0.93, 0.95, 1) });
    page.drawRectangle({ x: margin, y: y - 6, width: 25, height: 25, color: ACCENT });
    text(String(num), margin + 9, 12, bold, WHITE);
    text(title, margin + 37, 11.5, bold, ACCENT);
    y -= 34;
  };
  const label = (t: string) => { ensure(15); text(t.toUpperCase(), margin, 7.5, bold, GRAY); y -= 13; };
  const value = (t: string, size = 11.5) => { ensure(size + 6); text(t || "—", margin, size, font, DARK); y -= size + 7; };
  const paragraph = (t: string, size = 10) => {
    for (const ln of wrap(t, size, contentW - 8)) { ensure(size + 3); text(ln, margin, size, font, DARK); y -= size + 3; }
  };
  const pillAt = (x: number, top: number, str: string, tone: "green" | "red" | "gray") => {
    const bg = tone === "green" ? GREEN_BG : tone === "red" ? RED_BG : GRAY_BG;
    const fg = tone === "green" ? GREEN : tone === "red" ? RED : GRAY;
    const w = bold.widthOfTextAtSize(str, 9) + 16;
    page.drawRectangle({ x, y: top - 5, width: w, height: 17, color: bg });
    page.drawText(str, { x: x + 8, y: top, size: 9, font: bold, color: fg });
  };
  const qRow = (lbl: string, val: boolean | null, goodWhen: boolean | null) => {
    ensure(22);
    const lines = wrap(lbl, 10, 340);
    lines.forEach((ln, idx) => { text(ln, margin, 10, font, DARK); if (idx < lines.length - 1) y -= 12; });
    const str = triText(val);
    const tone = val === null ? "gray" : goodWhen === null ? "gray" : val === goodWhen ? "green" : "red";
    pillAt(margin + 380, y, str, tone);
    y -= 18;
  };

  // ── Header ──
  page.drawRectangle({ x: 0, y: H - 82, width: W, height: 82, color: NAVY });
  page.drawRectangle({ x: 0, y: H - 85, width: W, height: 3, color: ACCENT });
  page.drawText("Employment Verification", { x: margin, y: H - 44, size: 21, font: bold, color: WHITE });
  page.drawText("Safety Performance History  ·  DOT / FMCSA §391.23 / §40.25", { x: margin, y: H - 64, size: 10, font, color: rgb(0.72, 0.78, 0.88) });
  const vLogo = await embedLogo(pdf, d.companyLogo);
  const vLogoW = drawLogoRight(page, vLogo, { right: W - margin, centerY: H - 41, maxW: 130, maxH: 46 });
  const chipW = bold.widthOfTextAtSize("COMPLETED", 9) + 20;
  const chipX = W - margin - chipW - (vLogoW ? vLogoW + 16 : 0);
  page.drawRectangle({ x: chipX, y: H - 50, width: chipW, height: 19, color: GREEN_BG });
  page.drawText("COMPLETED", { x: chipX + 10, y: H - 44, size: 9, font: bold, color: GREEN });
  y = H - 82 - 16;

  // ── Applicant card (Part 1) ──
  const kvAt = (x: number, top: number, l: string, v: string) => {
    page.drawText(l.toUpperCase(), { x, y: top, size: 7.5, font: bold, color: GRAY });
    page.drawText(v || "—", { x, y: top - 13, size: 11.5, font, color: DARK });
  };
  const rows: [string, string, string, string][] = [
    ["Applicant", d.applicantName, "Position", d.position || "—"],
    ["Prior employer", d.employerName, "Dates stated by applicant", d.datesStated],
    ["Releasing to (hiring company)", d.companyName, "", ""],
  ];
  const cardH = rows.length * 32 + 8;
  page.drawRectangle({ x: margin, y: y - cardH, width: contentW, height: cardH, color: LIGHT, borderColor: BORDER, borderWidth: 1 });
  let ry = y - 20;
  for (const [l1, v1, l2, v2] of rows) { kvAt(margin + 16, ry, l1, v1); if (l2) kvAt(margin + 268, ry, l2, v2); ry -= 32; }
  y = y - cardH - 16;

  // ── Section 1: consent ──
  section(1, "Applicant Authorization (Consent)");
  paragraph(
    `I, ${d.applicantName}, authorize ${d.employerName} to release to ${d.companyName} all information regarding my ` +
    `employment, including safety performance history, dates of employment, reason for leaving, DOT drug & alcohol ` +
    `testing records, and any DOT-recordable accidents, for the purpose of employment verification. I release all ` +
    `parties from any liability for providing this information.`,
  );
  y -= 6;
  ensure(70);
  await signatureBox(d.consentSignature, `Applicant signature — signed ${fmt(d.consentSignedAt)}  ·  IP ${d.consentIp ?? "unknown"}`);

  // ── Section 2: accident / employment history ──
  y -= 4;
  section(2, "Accident History");
  const kv2 = (lbl: string, val: string, tone?: "green" | "red" | "gray") => {
    ensure(18);
    text(lbl, margin, 10, font, DARK);
    if (tone) pillAt(margin + 360, y, val, tone);
    else text(val, margin + 220, 10.5, bold, DARK);
    y -= 18;
  };
  kv2("Applicant was employed by us", triText(d.employedByUs), d.employedByUs === null ? "gray" : d.employedByUs ? "green" : "red");
  label("Employed — dates");
  value(d.confirmedStartDate ? `${fmtDay(d.confirmedStartDate)} — ${d.confirmedEndDate ? fmtDay(d.confirmedEndDate) : "Present"}` : "—");
  kv2("Drove a motor vehicle", triText(d.didDriveVehicle), d.didDriveVehicle === null ? "gray" : d.didDriveVehicle ? "green" : "gray");
  const vtypes = d.vehicleTypes.map((k) => VEHICLE_TYPES.find((v) => v.key === k)?.label ?? k);
  if (d.vehicleTypeOther) vtypes.push(d.vehicleTypeOther);
  label("Vehicle type(s)"); value(vtypes.length ? vtypes.join(", ") : "—");
  label("Reason for leaving"); value(REASONS.find((r) => r.key === d.reasonForLeavingType)?.label ?? "—");
  kv2("Eligible for rehire", triText(d.eligibleForRehire), d.eligibleForRehire === null ? "gray" : d.eligibleForRehire ? "green" : "red");
  if (d.noSafetyHistory) { paragraph("• No safety performance history to report."); }

  // accidents table
  y -= 4;
  label("Accidents (3 years prior to application)");
  if (d.accidents.length === 0) {
    value("No accident register data reported.", 10);
  } else {
    const cols = [
      { t: "Date", w: 90 }, { t: "Location", w: 150 }, { t: "# Inj.", w: 55 }, { t: "# Fat.", w: 55 }, { t: "Hazmat", w: contentW - 350 },
    ];
    ensure(20);
    let cx = margin;
    for (const c of cols) { text(c.t.toUpperCase(), cx + 2, 7.5, bold, GRAY); cx += c.w; }
    y -= 4;
    page.drawLine({ start: { x: margin, y }, end: { x: margin + contentW, y }, thickness: 0.5, color: BORDER });
    y -= 12;
    for (const a of d.accidents) {
      ensure(16);
      cx = margin;
      const cells = [a.date, a.location, a.injuries, a.fatalities, a.hazmat];
      cols.forEach((c, i) => { text(cells[i] || "—", cx + 2, 9.5, font, DARK); cx += c.w; });
      y -= 15;
    }
  }
  if (d.otherAccidents) { y -= 2; label("Other reported accidents"); paragraph(d.otherAccidents); }
  if (d.accidentRemarks) { y -= 2; label("Remarks"); paragraph(d.accidentRemarks); }

  // ── Section 3: drug & alcohol ──
  y -= 4;
  section(3, "Drug & Alcohol Information");
  if (d.noDrugAlcoholInfo) {
    paragraph("No drug & alcohol information is available on the named applicant.");
  } else {
    DA_QUESTIONS.forEach((q, i) => {
      const val = (d as unknown as Record<string, boolean | null>)[q.key];
      qRow(`${i + 1}. ${q.label}`, val ?? null, false);
    });
  }

  // ── Section 4: characteristics ──
  y -= 4;
  section(4, "Driver Characteristics");
  ensure(20);
  const ratColX = margin + 250;
  const ratColW = (contentW - 250) / 4;
  RATING_OPTIONS.forEach((o, i) => {
    const cx = ratColX + i * ratColW;
    text(o, cx + (ratColW - font.widthOfTextAtSize(o, 7.5)) / 2, 7.5, bold, GRAY);
  });
  y -= 4;
  page.drawLine({ start: { x: margin, y }, end: { x: margin + contentW, y }, thickness: 0.5, color: BORDER });
  y -= 14;
  for (const c of CHARACTERISTICS) {
    ensure(18);
    text(c.label, margin, 10, font, DARK);
    const sel = d.ratings[c.key];
    RATING_OPTIONS.forEach((o, i) => {
      const cx = ratColX + i * ratColW;
      if (sel === o) {
        page.drawRectangle({ x: cx + (ratColW - 16) / 2, y: y - 3, width: 16, height: 14, color: ACCENT });
        page.drawText("X", { x: cx + (ratColW - 16) / 2 + 5, y: y, size: 9, font: bold, color: WHITE });
      } else {
        page.drawRectangle({ x: cx + (ratColW - 12) / 2, y: y - 2, width: 12, height: 12, borderColor: BORDER, borderWidth: 1 });
      }
    });
    y -= 18;
  }

  // ── Prior employer signature ──
  y -= 6;
  ensure(96);
  label("Responded by");
  value(`${d.responderName ?? "—"}${d.responderTitle ? `  (${d.responderTitle})` : ""}`);
  y -= 2;
  await signatureBox(d.responderSignature, `Prior employer signature — responded ${fmt(d.respondedAt)}  ·  IP ${d.responderIp ?? "unknown"}`);

  // ── Footers ──
  const genStr = `Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`;
  for (const p of pdf.getPages()) {
    p.drawLine({ start: { x: margin, y: 40 }, end: { x: W - margin, y: 40 }, thickness: 0.5, color: BORDER });
    p.drawText("Prime Fleet — Safety Performance History", { x: margin, y: 28, size: 8, font, color: GRAY });
    const gw = font.widthOfTextAtSize(genStr, 8);
    p.drawText(genStr, { x: W - margin - gw, y: 28, size: 8, font, color: GRAY });
  }

  // ── Certificate ──
  await appendCertificate(pdf, font, bold, {
    envelopeId: d.envelopeId,
    documentTitle: `Employment Verification — ${d.applicantName} @ ${d.employerName}`,
    logo: d.companyLogo,
    signers: [
      { label: "Applicant (consent)", name: d.applicantName, at: fmt(d.consentSignedAt), ip: d.consentIp ?? "unknown" },
      { label: "Prior employer (response)", name: `${d.responderName ?? "—"}${d.responderTitle ? ` (${d.responderTitle})` : ""}`, at: fmt(d.respondedAt), ip: d.responderIp ?? "unknown" },
    ],
  });

  return pdf.save();

  // signature box helper (hoisted)
  async function signatureBox(dataUrl: string | null, caption: string) {
    const bw = 230, bh = 48, by = y - bh;
    page.drawRectangle({ x: margin, y: by, width: bw, height: bh, color: rgb(0.995, 0.995, 1), borderColor: BORDER, borderWidth: 1 });
    if (dataUrl && dataUrl.startsWith("data:image")) {
      try {
        const png = await pdf.embedPng(dataUrlToBytes(dataUrl));
        const scale = Math.min((bw - 18) / png.width, (bh - 10) / png.height);
        page.drawImage(png, { x: margin + (bw - png.width * scale) / 2, y: by + (bh - png.height * scale) / 2, width: png.width * scale, height: png.height * scale });
      } catch { /* ignore */ }
    }
    y = by - 12;
    page.drawText(caption, { x: margin, y, size: 8.5, font, color: GRAY });
    y -= 14;
  }
}
