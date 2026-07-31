import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont, type PDFImage } from "pdf-lib";
import { appendCertificate } from "./certificate";
import { embedLogo } from "./logo";
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

  // Header / prospective (hiring) employer contact
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyWebsite?: string | null;
  companyAddressLine?: string | null;
  companyStreet?: string | null;
  companyCityStateZip?: string | null;
  companyAttention?: string | null;
  companyFax?: string | null;

  // Prior (previous) employer contact
  employerEmail?: string | null;
  employerPhone?: string | null;
  employerStreet?: string | null;
  employerCityStateZip?: string | null;
  employerFax?: string | null;

  // Part 1 — alcohol/controlled-substances release window
  releaseFrom?: string | null;
  releaseTo?: string | null;

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

  // Part 5
  attempts?: { method: string; by: string; date: string }[];
  infoReceivedMethod?: string | null;
  infoReceivedAt?: Date | null;

  // Response
  responderName: string | null;
  responderTitle: string | null;
  responderSignature: string | null;
  respondedAt: Date | null;
  responderIp: string | null;
}

const DARK = rgb(0.09, 0.11, 0.15);
const GRAY = rgb(0.42, 0.47, 0.53);
const BLUE = rgb(0.16, 0.5, 0.85);
const NAVY = rgb(0.11, 0.16, 0.24);
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);

// Filled 24×24 Material-style icon paths for the header contact badges.
const CONTACT_ICONS: Record<string, string> = {
  phone:
    "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z",
  email:
    "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
  place:
    "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
  web:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
};

function dataUrlToBytes(u: string): Uint8Array {
  const b64 = u.includes(",") ? u.split(",")[1] : u;
  return Uint8Array.from(Buffer.from(b64, "base64"));
}
function fmt(dt: Date | null): string {
  if (!dt) return "—";
  return dt.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
}
function mdY(dt: Date | null): string {
  if (!dt) return "";
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
}
function mY(dt: Date | null): string {
  if (!dt) return "";
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "2-digit" });
}

export async function generateVerificationPdf(d: VerificationPdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 612, H = 792, margin = 40, contentW = W - margin * 2;
  const right = W - margin, bottomY = 46;
  const logoImg: PDFImage | null = await embedLogo(pdf, d.companyLogo);

  let page: PDFPage = pdf.addPage([W, H]);
  let y = 0;

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
  const w = (s: string, size = 10, f: PDFFont = font) => f.widthOfTextAtSize(s, size);
  const put = (s: string, x: number, size = 10, f: PDFFont = font, color = DARK) => {
    if (s) page.drawText(s, { x, y, size, font: f, color });
  };
  const underline = (x1: number, x2: number, dy = 2) => {
    if (x2 > x1) page.drawLine({ start: { x: x1, y: y - dy }, end: { x: x2, y: y - dy }, thickness: 0.7, color: DARK });
  };

  const contactBadge = (cx: number, cy: number, type: string) => {
    page.drawCircle({ x: cx, y: cy, size: 8, color: NAVY });
    const scale = 0.46; // 24 * 0.46 ≈ 11px glyph
    const sz = 24 * scale;
    page.drawSvgPath(CONTACT_ICONS[type], { x: cx - sz / 2, y: cy + sz / 2, scale, color: WHITE });
  };

  const drawHeader = () => {
    if (logoImg) {
      // Larger logo band so the mark reads clearly in the header.
      const boxTop = H - 16, boxH = 64, boxW = 280;
      const s = Math.min(boxW / logoImg.width, boxH / logoImg.height);
      page.drawImage(logoImg, {
        x: margin,
        y: boxTop - boxH + (boxH - logoImg.height * s) / 2,
        width: logoImg.width * s,
        height: logoImg.height * s,
      });
    }
    const items = [
      { t: d.companyPhone ?? "", icon: "phone" },
      { t: d.companyEmail ?? "", icon: "email" },
      { t: d.companyWebsite ?? "", icon: "web" },
      { t: d.companyAddressLine ?? "", icon: "place" },
    ].filter((x) => x.t);
    const size = 9;
    const lh = 18;
    const startCy = H - 50 + ((items.length - 1) * lh) / 2;
    items.forEach((it, i) => {
      const cy = startCy - i * lh;
      page.drawText(it.t, { x: right - 24 - w(it.t, size), y: cy - 3, size, font, color: DARK });
      contactBadge(right - 9, cy, it.icon);
    });
    page.drawLine({ start: { x: margin, y: H - 88 }, end: { x: right, y: H - 88 }, thickness: 2.4, color: BLUE });
  };

  const newPage = () => { page = pdf.addPage([W, H]); drawHeader(); y = H - 104; };
  const ensure = (space: number) => { if (y - space < bottomY) newPage(); };

  drawHeader();
  y = H - 104;

  // Document title
  const title = "SAFETY PERFORMANCE HISTORY RECORDS REQUEST";
  page.drawText(title, { x: margin + (contentW - w(title, 13, bold)) / 2, y, size: 13, font: bold, color: DARK });
  y -= 24;

  const partBar = (n: number, subtitle: string) => {
    ensure(34);
    const h = 18;
    page.drawRectangle({ x: margin, y: y - 12, width: contentW, height: h, borderColor: BLACK, borderWidth: 1 });
    page.drawLine({ start: { x: margin + 96, y: y - 12 }, end: { x: margin + 96, y: y + 6 }, thickness: 1, color: BLACK });
    page.drawText(`PART ${n}:`, { x: margin + 7, y: y - 7, size: 10.5, font: bold, color: DARK });
    page.drawText(subtitle, { x: margin + 96 + (contentW - 96 - w(subtitle, 10.5, bold)) / 2, y: y - 7, size: 10.5, font: bold, color: DARK });
    y -= 30;
  };

  // A labeled underlined field. Returns nothing; value sits on the rule.
  const blank = (label: string, value: string, x: number, xEnd: number, valBold = true) => {
    put(label, x, 10, font, DARK);
    const lx = x + w(label, 10) + 4;
    underline(lx, xEnd);
    if (value) page.drawText(value, { x: lx + 3, y: y + 1.5, size: 10, font: valBold ? bold : font, color: DARK });
  };

  // Yes/No (or option) with a short rule + X mark when selected. Returns next x.
  const opt = (label: string, selected: boolean, x: number): number => {
    put(label, x, 10, font, DARK);
    const lx = x + w(label, 10) + 3;
    const lw = 18;
    underline(lx, lx + lw);
    if (selected) page.drawText("X", { x: lx + lw / 2 - 3, y: y + 1.5, size: 10, font: bold, color: DARK });
    return lx + lw + 12;
  };

  const paragraph = (t: string, size = 9.5, gap = 3) => {
    for (const ln of wrap(t, size, contentW)) { ensure(size + gap); put(ln, margin, size, font, DARK); y -= size + gap; }
  };

  const sigOnLine = async (dataUrl: string | null, x: number, lineW: number, maxH = 30) => {
    if (dataUrl && dataUrl.startsWith("data:image")) {
      try {
        const png = await pdf.embedPng(dataUrlToBytes(dataUrl));
        const s = Math.min((lineW - 8) / png.width, maxH / png.height);
        page.drawImage(png, { x: x + (lineW - png.width * s) / 2, y: y + 2, width: png.width * s, height: png.height * s });
      } catch { /* ignore */ }
    }
  };

  // ─────────────────────────── PART 1 ───────────────────────────
  partBar(1, "TO BE COMPLETED BY PROSPECTIVE EMPLOYEE");

  put("I, (Print Name)", margin, 10);
  {
    const lx = margin + w("I, (Print Name)", 10) + 6;
    underline(lx, right);
    page.drawText(d.applicantName, { x: lx + 4, y: y + 1.5, size: 10.5, font: bold, color: DARK });
  }
  y -= 11;
  // captions row under the name blank
  const caps: [string, number][] = [["First", 60], ["M.I.", 150], ["Last", 220], ["Social Security Number", 320], ["Date of Birth", 470]];
  for (const [c, cx] of caps) page.drawText(c, { x: margin + cx, y, size: 8, font, color: GRAY });
  y -= 16;
  put("Hereby authorize:", margin, 10);
  y -= 22;

  const colGap = 300; // right column start
  blank("Previous Employer:", d.employerName, margin, margin + 250);
  blank("Email:", d.employerEmail ?? "", margin + colGap, right);
  y -= 22;
  blank("Street:", d.employerStreet ?? "", margin, margin + 250);
  blank("Telephone:", d.employerPhone ?? "", margin + colGap, right);
  y -= 22;
  blank("City, State, Zip:", d.employerCityStateZip ?? "", margin, margin + 250);
  blank("Fax No.:", d.employerFax ?? "", margin + colGap, right);
  y -= 26;

  put("To release and forward the information requested by section 3 of this document concerning my Alcohol and Controlled", margin, 9.5);
  y -= 14;
  {
    put("Substances Testing records within the previous 3 years from", margin, 9.5);
    let x = margin + w("Substances Testing records within the previous 3 years from", 9.5) + 6;
    underline(x, x + 90);
    if (d.releaseFrom) page.drawText(d.releaseFrom, { x: x + 4, y: y + 1.5, size: 9.5, font: bold, color: DARK });
    x += 96;
    put("To:", x, 9.5);
    x += w("To:", 9.5) + 4;
    underline(x, right);
    if (d.releaseTo) page.drawText(d.releaseTo, { x: x + 4, y: y + 1.5, size: 9.5, font: bold, color: DARK });
  }
  y -= 12;
  put("(date of employment application)", margin, 8, font, GRAY);
  y -= 24;

  put("Prospective Employer:", margin, 10);
  page.drawText(d.companyName, { x: margin + w("Prospective Employer:", 10) + 6, y, size: 10, font: bold, color: DARK });
  y -= 20;
  {
    put("Attention:", margin, 10);
    let x = margin + w("Attention:", 10) + 5;
    page.drawText(d.companyAttention || "Safety", { x, y, size: 10, font: bold, color: DARK });
    x += w(d.companyAttention || "Safety", 10, bold) + 16;
    put("Telephone:", x, 10);
    x += w("Telephone:", 10) + 5;
    page.drawText(d.companyPhone ?? "", { x, y, size: 10, font: bold, color: DARK });
  }
  y -= 20;
  put("Street:", margin, 10);
  page.drawText(d.companyStreet ?? "", { x: margin + w("Street:", 10) + 6, y, size: 10, font: bold, color: DARK });
  y -= 20;
  put("City, State, Zip:", margin, 10);
  page.drawText(d.companyCityStateZip ?? "", { x: margin + w("City, State, Zip:", 10) + 6, y, size: 10, font: bold, color: DARK });
  y -= 22;
  paragraph("In compliance with §40.25(g) and 391.23(h), release of this information must be made in a written form that ensures confidentiality, such as fax, email, or letter.");
  y -= 8;
  put("Prospective employer's fax number:", margin, 10);
  page.drawText(d.companyFax ?? "", { x: margin + w("Prospective employer's fax number:", 10) + 6, y, size: 10, font: bold, color: DARK });
  y -= 20;
  put("Prospective employer's email address:", margin, 10);
  page.drawText(d.companyEmail ?? "", { x: margin + w("Prospective employer's email address:", 10) + 6, y, size: 10, font: bold, color: DARK });
  y -= 34;

  // Applicant signature
  {
    const lw = 210;
    await sigOnLine(d.consentSignature, margin, lw);
    if (d.consentSignedAt) page.drawText(mdY(d.consentSignedAt), { x: margin + lw + 40, y: y + 3, size: 10, font, color: DARK });
    page.drawLine({ start: { x: margin, y }, end: { x: margin + lw, y }, thickness: 0.8, color: DARK });
    page.drawLine({ start: { x: margin + lw + 30, y }, end: { x: margin + lw + 30 + 150, y }, thickness: 0.8, color: DARK });
    y -= 12;
    page.drawText("Applicant's Signature", { x: margin + 40, y, size: 9.5, font, color: DARK });
    page.drawText("Date", { x: margin + lw + 30 + 60, y, size: 9.5, font, color: DARK });
  }
  y -= 22;
  paragraph("This information is being requested in compliance with §40.25(g) and 391.23.", 9);

  // ─────────────────────────── PART 2 ───────────────────────────
  newPage();
  partBar(2, "TO BE COMPLETED BY PREVIOUS EMPLOYER");
  page.drawText("ACCIDENT HISTORY", { x: margin + (contentW - w("ACCIDENT HISTORY", 11, bold)) / 2, y, size: 11, font: bold, color: DARK });
  y -= 24;

  {
    let x = margin;
    put("The applicant named above was employed by us.", x, 10);
    x += w("The applicant named above was employed by us.", 10) + 10;
    x = opt("Yes", d.employedByUs === true, x);
    opt("No", d.employedByUs === false, x);
  }
  y -= 24;
  {
    put("Employed as", margin, 10);
    let x = margin + w("Employed as", 10) + 6;
    underline(x, x + 150);
    page.drawText(d.position || "", { x: x + 4, y: y + 1.5, size: 10, font: bold, color: DARK });
    x += 156;
    put("from (m/y)", x, 10);
    x += w("from (m/y)", 10) + 5;
    underline(x, x + 70);
    page.drawText(mY(d.confirmedStartDate), { x: x + 4, y: y + 1.5, size: 10, font: bold, color: DARK });
    x += 76;
    put("to (m/y)", x, 10);
    x += w("to (m/y)", 10) + 5;
    underline(x, right);
    page.drawText(d.confirmedEndDate ? mY(d.confirmedEndDate) : (d.employedByUs ? "Present" : ""), { x: x + 4, y: y + 1.5, size: 10, font: bold, color: DARK });
  }
  y -= 24;
  {
    let x = margin;
    put("1. Did he/she drive motor vehicle for you?", x, 10);
    x += w("1. Did he/she drive motor vehicle for you?", 10) + 8;
    x = opt("Yes", d.didDriveVehicle === true, x);
    opt("No", d.didDriveVehicle === false, x);
  }
  y -= 22;
  put("If yes, what type?", margin, 10);
  y -= 18;
  {
    let x = margin + 4;
    for (const vt of VEHICLE_TYPES.filter((v) => v.key !== "other")) {
      x = opt(vt.label, d.vehicleTypes.includes(vt.key), x);
    }
  }
  y -= 22;
  blank("Other (Specify)", d.vehicleTypes.includes("other") ? (d.vehicleTypeOther ?? "Yes") : (d.vehicleTypeOther ?? ""), margin, right);
  y -= 24;
  {
    let x = margin;
    put("2. Reason for leaving your employ:", x, 10);
    x += w("2. Reason for leaving your employ:", 10) + 8;
    for (const r of REASONS.filter((rr) => rr.key !== "OTHER")) {
      x = opt(r.label, d.reasonForLeavingType === r.key, x);
    }
  }
  y -= 24;
  {
    put("If there is no safety performance history to report, check here", margin, 10);
    const lx = margin + w("If there is no safety performance history to report, check here", 10) + 4;
    underline(lx, lx + 18);
    if (d.noSafetyHistory) page.drawText("X", { x: lx + 6, y: y + 1.5, size: 10, font: bold, color: DARK });
    put(", sign below and return.", lx + 22, 10);
  }
  y -= 26;

  page.drawText("ACCIDENTS:", { x: margin, y, size: 10, font: bold, color: DARK });
  {
    const intro = " Complete the following for any accidents included on your accident register (§390.15(b)) that involved the applicant in the 3 years prior to the application date shown above.";
    const lines = wrap(intro, 9.5, contentW - w("ACCIDENTS:", 10, bold));
    lines.forEach((ln, i) => {
      put(ln, i === 0 ? margin + w("ACCIDENTS:", 10, bold) : margin, 9.5, font, DARK);
      if (i < lines.length - 1) y -= 12;
    });
  }
  y -= 20;
  // accidents table
  {
    const cols = [
      { t: "", w: 18 },
      { t: "Date", w: 90 },
      { t: "Location", w: 150 },
      { t: "# Injuries", w: 80 },
      { t: "# Fatalities", w: 80 },
      { t: "Hazmat Spill", w: contentW - 18 - 90 - 150 - 80 - 80 },
    ];
    let cx = margin;
    for (const c of cols) { if (c.t) page.drawText(c.t, { x: cx + 4, y, size: 9, font: bold, color: DARK }); cx += c.w; }
    y -= 6;
    for (let i = 0; i < 3; i++) {
      const a = d.accidents[i];
      const cells = ["", a?.date ?? "", a?.location ?? "", a?.injuries ?? "", a?.fatalities ?? "", a?.hazmat ?? ""];
      cx = margin;
      cols.forEach((c, ci) => {
        if (ci === 0) page.drawText(`${i + 1}.`, { x: cx, y: y - 2, size: 9.5, font, color: DARK });
        else {
          underline(cx, cx + c.w - 6, 0);
          if (cells[ci]) page.drawText(cells[ci], { x: cx + 3, y: y + 1, size: 9.5, font: bold, color: DARK });
        }
        cx += c.w;
      });
      y -= 22;
    }
  }
  y -= 4;
  put("Please provide information concerning any other accidents involving the applicant that were reported to government", margin, 9.5);
  y -= 12;
  put("agencies or insurers or retained under internal company policies:", margin, 9.5);
  y -= 16;
  {
    const lines = wrap(d.otherAccidents ?? "", 9.5, contentW);
    for (let i = 0; i < 2; i++) {
      underline(margin, right, 0);
      if (lines[i]) page.drawText(lines[i], { x: margin + 2, y: y + 2, size: 9.5, font, color: DARK });
      y -= 18;
    }
  }
  y -= 6;
  put("Any other remarks:", margin, 9.5);
  y -= 16;
  {
    const lines = wrap(d.accidentRemarks ?? "", 9.5, contentW);
    for (let i = 0; i < 3; i++) {
      underline(margin, right, 0);
      if (lines[i]) page.drawText(lines[i], { x: margin + 2, y: y + 2, size: 9.5, font, color: DARK });
      y -= 18;
    }
  }
  y -= 12;
  // Part 2 signature block (prior employer)
  {
    const lblW = w("Signature:", 10);
    put("Signature:", margin + 120, 10);
    await sigOnLine(d.responderSignature, margin + 120 + lblW + 6, right - (margin + 120 + lblW + 6));
    page.drawLine({ start: { x: margin + 120 + lblW + 6, y }, end: { x: right, y }, thickness: 0.8, color: DARK });
    y -= 22;
    put("Title:", margin + 120, 10);
    const tx = margin + 120 + w("Title:", 10) + 6;
    underline(tx, margin + 300);
    page.drawText(d.responderTitle ?? "", { x: tx + 3, y: y + 1.5, size: 10, font: bold, color: DARK });
    put("Date:", margin + 320, 10);
    const dx = margin + 320 + w("Date:", 10) + 6;
    underline(dx, right);
    page.drawText(mdY(d.respondedAt), { x: dx + 3, y: y + 1.5, size: 10, font: bold, color: DARK });
  }

  // ─────────────────────────── PART 3 ───────────────────────────
  newPage();
  partBar(3, "TO BE COMPLETED BY PREVIOUS EMPLOYER");
  page.drawText("DRUG & ALCOHOL INFORMATION", { x: margin, y, size: 11, font: bold, color: DARK });
  y -= 20;
  {
    const t = "Please provide the following drug and alcohol information as required by FMCSR part 391.23 & 40.25. If no drug and alcohol information is available on above named applicant check here";
    const lines = wrap(t, 9.5, contentW - 26);
    lines.forEach((ln) => { put(ln, margin, 9.5, font, DARK); y -= 13; });
    // check box appended after last line
    const lastW = w(lines[lines.length - 1], 9.5);
    const bx = margin + lastW + 6, byy = y + 13 - 2;
    page.drawRectangle({ x: bx, y: byy, width: 11, height: 11, borderColor: BLACK, borderWidth: 1 });
    if (d.noDrugAlcoholInfo) page.drawText("X", { x: bx + 2, y: byy + 1.5, size: 9, font: bold, color: DARK });
  }
  y -= 10;

  // Yes/No column headers
  const yesX = margin + 360, noX = margin + 400;
  page.drawText("Yes", { x: yesX - 2, y, size: 9, font: bold, color: DARK });
  page.drawText("No", { x: noX, y, size: 9, font: bold, color: DARK });
  y -= 16;

  const daBox = (num: number, label: string, val: boolean | null) => {
    ensure(30);
    const lines = wrap(`${num}. ${label}`, 9.5, 330);
    const topY = y;
    lines.forEach((ln, i) => { put(ln, margin, 9.5, font, DARK); if (i < lines.length - 1) y -= 12; });
    // boxes aligned to the first line
    const drawBox = (bx: number, checked: boolean) => {
      page.drawRectangle({ x: bx, y: topY - 2, width: 11, height: 11, borderColor: BLACK, borderWidth: 1 });
      if (checked) page.drawText("X", { x: bx + 2, y: topY - 0.5, size: 9, font: bold, color: DARK });
    };
    drawBox(yesX, val === true);
    drawBox(noX, val === false);
    y -= 18;
  };
  daBox(1, "Any alcohol test with a result of 0.04 or higher alcohol concentration?", d.daAlcoholTest);
  daBox(2, "Any verified positive drug test?", d.daPositiveTest);
  daBox(3, "Any refusals to be tested (including verified adulterated or substituted drug test results)?", d.daRefusals);
  daBox(4, "Any other violations of DOT agency drug and alcohol testing regulations (Part 382 or Part 40)?", d.daOtherViolations);
  y -= 4;
  {
    const q5 = "5. If this driver did successfully complete a SAP rehabilitation referral and remained in your employment, did he/she have any subsequent violations for: an alcohol test result of 0.04 or greater, a verified positive drug test or a refusal to test (including a verified adulterated/substituted drug test result)?";
    const lines = wrap(q5, 9.5, contentW);
    lines.forEach((ln) => { ensure(14); put(ln, margin, 9.5, font, DARK); y -= 12; });
    if (d.daSapSubsequent !== null) {
      put(`Answer: ${d.daSapSubsequent ? "Yes" : "No"}`, margin, 9.5, bold, DARK);
      y -= 14;
    }
  }
  y -= 4;
  paragraph("6. If yes to any of the above questions, please provide documentation of successful completion of a SAP evaluation, prescribed treatment and return-to-duty requirements (including follow-up tests) if they remained in your employment.");
  y -= 4;
  paragraph("In answering these questions, include any required DOT drug or alcohol testing information obtained from prior previous employers in the previous 3 years prior to the application date shown in Section 1.");
  y -= 12;

  blank("Name:", d.responderName ?? "", margin, margin + 250);
  blank("Telephone:", d.employerPhone ?? "", margin + 300, right);
  y -= 22;
  blank("Company:", d.employerName, margin, right);
  y -= 22;
  {
    blank("Street:", d.employerStreet ?? "", margin, margin + 150);
    put("City:", margin + 175, 10);
    const cx = margin + 175 + w("City:", 10) + 4;
    underline(cx, margin + 300);
    page.drawText(d.employerCityStateZip ?? "", { x: cx + 3, y: y + 1.5, size: 9, font: bold, color: DARK });
    blank("State:", "", margin + 320, margin + 400);
    blank("Zip:", "", margin + 420, right);
  }
  y -= 26;
  {
    put("Section 3 completed by (Signature)", margin, 10);
    const sx = margin + w("Section 3 completed by (Signature)", 10) + 6;
    await sigOnLine(d.responderSignature, sx, margin + 360 - sx);
    page.drawLine({ start: { x: sx, y }, end: { x: margin + 360, y }, thickness: 0.8, color: DARK });
    put("Date:", margin + 380, 10);
    const dx = margin + 380 + w("Date:", 10) + 6;
    underline(dx, right);
    page.drawText(mdY(d.respondedAt), { x: dx + 3, y: y + 1.5, size: 10, font: bold, color: DARK });
  }

  // ─────────────────────────── PART 4 & 5 ───────────────────────────
  newPage();
  partBar(4, "TO BE COMPLETED BY PREVIOUS EMPLOYER");
  y -= 4;
  // Characteristics table
  {
    const labelW = 200;
    const cellW = (contentW - labelW) / 4;
    const rowH = 26;
    const startY = y + 6;
    const rows = CHARACTERISTICS.length + 1; // + header
    const tableH = rows * rowH;
    // outer + grid
    page.drawRectangle({ x: margin, y: startY - tableH, width: contentW, height: tableH, borderColor: BLACK, borderWidth: 1 });
    for (let r = 1; r < rows; r++) {
      const ly = startY - r * rowH;
      page.drawLine({ start: { x: margin, y: ly }, end: { x: right, y: ly }, thickness: 0.7, color: BLACK });
    }
    page.drawLine({ start: { x: margin + labelW, y: startY }, end: { x: margin + labelW, y: startY - tableH }, thickness: 0.7, color: BLACK });
    for (let c = 1; c < 4; c++) {
      const lx = margin + labelW + c * cellW;
      page.drawLine({ start: { x: lx, y: startY }, end: { x: lx, y: startY - tableH }, thickness: 0.7, color: BLACK });
    }
    // header row
    const hy = startY - rowH + 9;
    page.drawText("CHARACTERISTICS", { x: margin + 10, y: hy, size: 9.5, font: bold, color: DARK });
    RATING_OPTIONS.forEach((o, i) => {
      const cx = margin + labelW + i * cellW;
      page.drawText(o, { x: cx + (cellW - w(o, 9.5, bold)) / 2, y: hy, size: 9.5, font: bold, color: DARK });
    });
    // characteristic rows
    CHARACTERISTICS.forEach((ch, ri) => {
      const ry = startY - (ri + 2) * rowH + 9;
      page.drawText(ch.label, { x: margin + 8, y: ry, size: 9, font, color: DARK });
      const sel = d.ratings[ch.key];
      RATING_OPTIONS.forEach((o, ci) => {
        if (sel === o) {
          const cx = margin + labelW + ci * cellW;
          page.drawText("X", { x: cx + cellW / 2 - 4, y: ry, size: 12, font: bold, color: DARK });
        }
      });
    });
    y = startY - tableH - 24;
  }

  partBar(5, "TO BE COMPLETED BY COMPANY");
  const attempt = (n: number, label: string, a?: { method: string; by: string; date: string }) => {
    ensure(40);
    page.drawText(label, { x: margin, y, size: 10, font: bold, color: DARK });
    y -= 16;
    const m = (a?.method ?? "").toLowerCase();
    let x = margin;
    put("This form was", x, 10);
    x += w("This form was", 10) + 8;
    x = opt("Faxed", m.includes("fax"), x);
    x = opt("Emailed", m.includes("email") || m.includes("online"), x);
    x = opt("Other", !!m && !m.includes("fax") && !m.includes("email") && !m.includes("online"), x);
    put("By:", x, 10);
    const bx = x + w("By:", 10) + 5;
    underline(bx, margin + 330);
    page.drawText(a?.by ?? "", { x: bx + 3, y: y + 1.5, size: 9.5, font: bold, color: DARK });
    put("Date:", margin + 350, 10);
    const dx = margin + 350 + w("Date:", 10) + 5;
    underline(dx, right);
    page.drawText(a?.date ?? "", { x: dx + 3, y: y + 1.5, size: 9.5, font: bold, color: DARK });
    y -= 22;
  };
  const at = d.attempts ?? [];
  attempt(1, "1st Attempt", at[0]);
  attempt(2, "2nd Attempt", at[1]);
  attempt(3, "3rd Attempt", at[2]);
  y -= 8;
  {
    const rm = (d.infoReceivedMethod ?? "").toLowerCase();
    let x = margin;
    put("Information was received by:", x, 10);
    x += w("Information was received by:", 10) + 8;
    x = opt("Fax", rm.includes("fax"), x);
    x = opt("Mail", rm.includes("mail"), x);
    x = opt("Other", !!rm && !rm.includes("fax") && !rm.includes("mail"), x);
    put("Date received:", x, 10);
    const dx = x + w("Date received:", 10) + 5;
    underline(dx, right);
    page.drawText(d.infoReceivedAt ? mdY(d.infoReceivedAt) : (d.respondedAt ? mdY(d.respondedAt) : ""), { x: dx + 3, y: y + 1.5, size: 9.5, font: bold, color: DARK });
  }

  // ── Footer on every page ──
  const genStr = `Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`;
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: margin, y: 34 }, end: { x: right, y: 34 }, thickness: 0.5, color: rgb(0.8, 0.83, 0.88) });
    p.drawText("Safety Performance History Records Request  ·  §40.25(g) / §391.23", { x: margin, y: 23, size: 7.5, font, color: GRAY });
    const pg = `Page ${i + 1} of ${pages.length}`;
    p.drawText(pg, { x: (W - w(pg, 7.5)) / 2, y: 23, size: 7.5, font, color: GRAY });
    p.drawText(genStr, { x: right - w(genStr, 7.5), y: 23, size: 7.5, font, color: GRAY });
  });

  // ── Certificate of Completion (audit trail + integrity hash) ──
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
}
