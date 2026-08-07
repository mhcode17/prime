import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont, type PDFImage } from "pdf-lib";
import { appendCertificate } from "./certificate";
import { embedLogo } from "./logo";

export interface AgreementPdfData {
  envelopeId: string;
  companyName: string;
  companyLogo?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyWebsite?: string | null;
  companyAddressLine?: string | null;
  docsEmail?: string | null; // where load docs are submitted (Section 6)

  // Company-filled terms
  contractorName: string;
  compensationPercent: string;
  cpm: string;
  securityDeposit: string;
  depositWeeklyInstallment: string;
  equipmentLessor: string;

  // Signature
  signerName: string | null;
  signerSignature: string | null;
  signedAt: Date | null;
  signerIp: string | null;
}

const DARK = rgb(0.09, 0.11, 0.15);
const GRAY = rgb(0.42, 0.47, 0.53);
const BLUE = rgb(0.16, 0.5, 0.85);
const NAVY = rgb(0.11, 0.16, 0.24);
const BORDER = rgb(0.75, 0.78, 0.82);
const HEAD_BG = rgb(0.93, 0.95, 0.98);
const WHITE = rgb(1, 1, 1);

const CONTACT_ICONS: Record<string, string> = {
  phone:
    "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z",
  email:
    "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
  web:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
  place:
    "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
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

type Run = { t: string; b?: boolean };

export async function generateAgreementPdf(d: AgreementPdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 612, H = 792, margin = 48, contentW = W - margin * 2;
  const right = W - margin, bottomY = 54;
  const logoImg: PDFImage | null = await embedLogo(pdf, d.companyLogo);

  let page: PDFPage = pdf.addPage([W, H]);
  let y = 0;

  const w = (s: string, size: number, f: PDFFont = font) => f.widthOfTextAtSize(s, size);

  const contactBadge = (cx: number, cy: number, type: string) => {
    page.drawCircle({ x: cx, y: cy, size: 6.5, color: NAVY });
    const scale = 0.4;
    const sz = 24 * scale;
    page.drawSvgPath(CONTACT_ICONS[type], { x: cx - sz / 2, y: cy + sz / 2, scale, color: WHITE });
  };

  const drawHeader = () => {
    if (logoImg) {
      const boxTop = H - 14, boxH = 78, boxW = 300;
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
    const size = 8;
    const lh = 15;
    const startCy = H - 46 + ((items.length - 1) * lh) / 2;
    items.forEach((it, i) => {
      const cy = startCy - i * lh;
      page.drawText(it.t, { x: right - 22 - w(it.t, size), y: cy - 2.8, size, font, color: DARK });
      contactBadge(right - 8, cy, it.icon);
    });
    page.drawLine({ start: { x: margin, y: H - 96 }, end: { x: right, y: H - 96 }, thickness: 2.4, color: BLUE });
  };

  const newPage = () => { page = pdf.addPage([W, H]); drawHeader(); y = H - 116; };
  const ensure = (space: number) => { if (y - space < bottomY) newPage(); };

  drawHeader();
  y = H - 116;

  // ── Rich paragraph with optional bold runs and word wrap ──
  const richPara = (runs: Run[], size = 9.5, gapAfter = 7, lineGap = 3.5) => {
    const lineH = size + lineGap;
    let lineWords: { s: string; f: PDFFont }[] = [];
    let lineW = 0;
    const spaceW = w(" ", size);
    const flush = () => {
      ensure(lineH);
      let x = margin;
      lineWords.forEach((word, i) => {
        page.drawText(word.s, { x, y, size, font: word.f, color: DARK });
        x += w(word.s, size, word.f) + (i < lineWords.length - 1 ? spaceW : 0);
      });
      y -= lineH;
      lineWords = [];
      lineW = 0;
    };
    for (const run of runs) {
      const f = run.b ? bold : font;
      const words = run.t.split(/\s+/).filter(Boolean);
      for (const word of words) {
        const ww = w(word, size, f);
        const add = (lineWords.length ? spaceW : 0) + ww;
        if (lineW + add > contentW && lineWords.length) flush();
        lineWords.push({ s: word, f });
        lineW += (lineWords.length > 1 ? spaceW : 0) + ww;
      }
    }
    if (lineWords.length) flush();
    y -= gapAfter;
  };
  const para = (text: string, size = 9.5, gapAfter = 7) => richPara([{ t: text }], size, gapAfter);

  const sectionHeading = (num: number, title: string) => {
    ensure(30);
    y -= 6;
    const label = `${num}.  ${title}`;
    page.drawText(label, { x: margin + (contentW - w(label, 11.5, bold)) / 2, y, size: 11.5, font: bold, color: DARK });
    y -= 20;
  };
  const subHeading = (title: string) => {
    ensure(20);
    page.drawText(title, { x: margin, y, size: 10, font: bold, color: DARK });
    y -= 15;
  };
  const bullet = (text: string) => richPara([{ t: `•  ${text}` }], 9.5, 3);

  // ── Table ──
  const table = (headers: string[], rows: string[][], widths: number[]) => {
    const size = 8.5, pad = 4, lineH = 11;
    const cellLines = (cells: string[]) =>
      cells.map((c, i) => {
        const maxW = widths[i] - pad * 2;
        const out: string[] = [];
        let line = "";
        for (const word of String(c).split(" ")) {
          const test = line ? `${line} ${word}` : word;
          if (w(test, size) > maxW && line) { out.push(line); line = word; } else line = test;
        }
        out.push(line);
        return out.length ? out : [""];
      });
    const drawRow = (cells: string[], isHead: boolean) => {
      const lines = cellLines(cells);
      const rowH = Math.max(...lines.map((l) => l.length)) * lineH + pad * 2;
      ensure(rowH + 2);
      const top = y;
      if (isHead) page.drawRectangle({ x: margin, y: top - rowH, width: contentW, height: rowH, color: HEAD_BG });
      let cx = margin;
      widths.forEach((cw, ci) => {
        page.drawRectangle({ x: cx, y: top - rowH, width: cw, height: rowH, borderColor: BORDER, borderWidth: 0.7 });
        lines[ci].forEach((ln, li) => {
          page.drawText(ln, { x: cx + pad, y: top - pad - 8 - li * lineH, size, font: isHead ? bold : font, color: DARK });
        });
        cx += cw;
      });
      y -= rowH;
    };
    drawRow(headers, true);
    for (const r of rows) drawRow(r, false);
    y -= 8;
  };

  const co = d.companyName;
  const pct = d.compensationPercent || "____";
  const cpm = d.cpm || "____";
  const dep = d.securityDeposit || "0";
  const inst = d.depositWeeklyInstallment || "0";
  const lessor = d.equipmentLessor || "various third-party leasing companies";
  const docsEmail = d.docsEmail || d.companyEmail || "the Company";

  // ── Title ──
  y -= 4;
  const title = "DRIVER INDEPENDENT CONTRACTOR AGREEMENT";
  page.drawText(title, { x: margin + (contentW - w(title, 13, bold)) / 2, y, size: 13, font: bold, color: DARK });
  y -= 26;

  // 1. Introduction
  sectionHeading(1, "Introduction");
  richPara([
    { t: `This Driver Independent Contractor Agreement ("Agreement") is entered into by and between ` },
    { t: co, b: true },
    { t: ` ("Company" or "Carrier"), and ` },
    { t: d.contractorName || "________________________", b: true },
    { t: ` ("Contractor").` },
  ]);
  richPara([
    { t: `The parties expressly intend to create an independent contractor relationship and not an employer-employee relationship. Contractor will provide driving services using commercial motor vehicle equipment leased by the Company from ` },
    { t: lessor, b: true },
    { t: ` and made available to Contractor under the terms herein.` },
  ]);

  // 2. Independent Contractor Relationship
  sectionHeading(2, "Independent Contractor Relationship");
  para(`Contractor is an independent contractor and not an employee of the Company. Contractor shall have control over the manner and means of performing driving services, subject to compliance with applicable laws, safety regulations, company policies and customer requirements. The Company will not withhold taxes, provide employee benefits, or exercise day-to-day supervision beyond dispatch and regulatory compliance. Contractor is responsible for all federal, state, and local taxes, including self-employment taxes.`);

  // 3. Equipment Provision and Responsibility
  sectionHeading(3, "Equipment Provision and Responsibility");
  para(`The Company shall lease commercial motor vehicle(s) and/or trailer(s) from various third-party leasing companies and make such equipment ("Equipment") available to Contractor for use during the term of this Agreement. Contractor shall have exclusive possession, control, and use of the Equipment for the duration of loads dispatched under this Agreement. Contractor shall be responsible for daily pre- and post-trip inspections and keeping the Equipment clean. Contractor shall immediately report any mechanical issues or damage. All major maintenance, repairs, tires, registration, and permits shall not be contractors' responsibility.`);

  // 4. Services Provided
  sectionHeading(4, "Services Provided");
  para(`Contractor agrees to provide driving services for freight tendered by the Company in a safe, lawful, and timely manner. Once a load is accepted, Contractor shall complete the load without cancellation or unreasonable delay except for reasonable cause and with Company approval.`);
  para(`Contractor shall comply with all applicable federal, state, and local laws and regulations, including all FMCSA regulations, hours-of-service rules, and safety standards. Contractor must maintain a valid CDL and required endorsements, be medically qualified, and operate only properly registered, insured, and roadworthy equipment.`);
  para(`Contractor is responsible for safe vehicle operation, proper cargo securement, and immediately reporting any accident, violation, delay, or condition affecting a load. Any violation of this section constitutes a material breach of this Agreement.`);

  // 5. Compensation and Deductions
  sectionHeading(5, "Compensation and Deductions");
  richPara([{ t: "A.", b: true }, { t: " The following " }, { t: "monthly deductions", b: true }, { t: " are made from Contractor's settlements:" }]);
  richPara([{ t: "Occupational Accident Insurance: $127.00", b: true }, { t: " (Occupational Insurance declaration page will be provided upon request)" }]);
  richPara([{ t: "Security Deposit:", b: true }, { t: ` The Company may require to provide a refundable security deposit of up to $` }, { t: dep, b: true }, { t: `.` }]);
  richPara([
    { t: `Driver will be notified prior to the commencement of any deductions. In this case, refundable security deposit of $` },
    { t: dep, b: true },
    { t: ` will be deducted in equal installments of $` },
    { t: inst, b: true },
    { t: ` per week over the Driver's first ten (10) weeks.` },
  ]);
  richPara([
    { t: "B.", b: true }, { t: " Contractor shall be " }, { t: "compensated", b: true }, { t: " at " }, { t: `${pct}%`, b: true },
    { t: " of the gross revenue for each load hauled or at " }, { t: cpm, b: true }, { t: " CPM including loaded and empty miles." },
  ]);
  subHeading("Detention Pay, Layover Pay, and TONU (Truck Ordered Not Used)");
  para(`Any detention pay, layover pay, or TONU compensation paid by the broker or shipper to the Company shall be passed through to the Contractor at 50% of the amount received. The Company shall retain the remaining 50%.`);
  para(`Such payments will be included in the Contractor's settlement only if and when the broker or shipper actually pays the Company. No payment shall be due from the Company if the broker or shipper does not pay.`);
  subHeading("Breakdown Pay");
  para(`In the event of a mechanical breakdown that prevents Contractor from operating the Equipment, the Company shall pay Contractor breakdown compensation of $100.00 per day, capped at a maximum of three (3) calendar days per occurrence, unless additional days are pre-approved in writing by the Company. Breakdown pay shall commence after the first 24 hours of downtime and shall be supported by documentation of the breakdown and repair.`);
  subHeading("Layover Pay (No Load Available)");
  para(`If Contractor is ready and available for dispatch but no load is assigned due to the Company's inability to secure freight (through no fault of Contractor), the Company shall pay Contractor layover compensation of $100.00 per day.`);
  para(`This layover pay applies only to weekdays (Monday through Friday, excluding observed federal holidays) and is contingent upon Contractor being in full compliance with all terms of this Agreement. No layover pay shall be due if the lack of available load results from Contractor's actions, including not limited to late delivery of a previous load, refusal of reasonably offered loads, failure to communicate availability, or any violation of Company policies or procedures.`);
  para(`All breakdowns and layover payments shall be included in the next regular settlement statement following submission of supporting documentation (e.g., repair invoices, communication records.)`);

  // 6. Documentation, Tracking, and Payment Procedures
  sectionHeading(6, "Documentation, Tracking, and Payment Procedures");
  para(`To ensure accurate and timely settlement of compensation:`);
  para(`(a) Contractor shall submit complete, true, and legible documentation for each load, including but not limited to fully signed Bills of Lading (BOL), Proofs of Delivery (POD), rate confirmations (if applicable), and any lumper, detention, layover, toll, scale, or other accessorial receipts. All documents must clearly show load numbers, dates, locations, and signatures where required.`);
  richPara([
    { t: `(b) All required documentation must be transmitted immediately upon delivery and no later than twenty-four (24) hours after completion of the load, as clear, complete PDF files, to ` },
    { t: docsEmail, b: true },
    { t: `, unless otherwise instructed in writing by the Company. Contractor is responsible for retaining original documents for a minimum of ninety (90) days and shall provide originals upon request.` },
  ]);
  para(`(c) When required by the Company, broker, or customer, Contractor agrees to accept, install, and properly use Macropoint, or an equivalent GPS tracking or shipment visibility platform, for the duration of the load. Contractor shall not disable, interfere with, or manipulate any tracking system and acknowledges that failure to maintain required tracking may result in withheld dispatches or delayed payment.`);
  para(`The billing week shall run from Monday to Monday, based on the delivery date. Weekly settlement statements will be issued every Thursday between 10:00 AM and 5:00 PM Central Time. Payments shall be made via direct deposit every Friday by 5:00 PM Central Time, provided all required documentation has been received, verified, and approved by the Company.`);
  para(`The Company reserves the right to withhold or delay payment for any load with missing, incomplete, incorrect, or illegible documentation until such deficiencies are cured. The Company may also deduct from settlement any advances, chargebacks, customer deductions, fines, or amounts lawfully owed by Contractor. Contractor acknowledges that repeated failure to submit timely and proper documentation constitutes a material breach of this Agreement and may result in suspension of dispatch or termination.`);

  // 7. Insurance Deductibles and Coverage Limits
  sectionHeading(7, "Insurance Deductibles and Coverage Limits");
  para(`The following deductibles and policy limits apply to the insurance coverages maintained in connection with this Agreement:`);
  table(
    ["Coverage Type", "Deductible Amount", "Policy Limit"],
    [
      ["Auto Liability", "$5,000", "$1,000,000"],
      ["Cargo – Not at Fault", "$5,000", "$250,000"],
      ["Cargo – At Fault", "$10,000", "$250,000"],
      ["Company Equipment Physical Damage", "$5,000", "Stated Value"],
      ["Independent Contractor Driver Physical Damage", "$5,000", "Stated Value"],
    ],
    [246, 140, contentW - 246 - 140],
  );

  // 8. Safety Compliance, Violations, and Incentives
  sectionHeading(8, "Safety Compliance, Violations, and Incentives");
  para(`Contractor agrees to prioritize safety in all operations and comply with the following provisions:`);
  para(`A) Reporting Requirements — All DOT roadside inspections (regardless of outcome) must be reported to the Company within 72 hours of occurrence, including submission of the inspection report. Any accidents, incidents, injuries, or spills must be reported to Company dispatch immediately.`);
  para(`B) In the event of citations or out-of-service (OOS) orders resulting from roadside inspections or other enforcement actions attributable to Contractor's actions or equipment, the following penalties may be assessed and deducted from settlements:`);
  table(
    ["Violation Category", "1st Offense", "2nd Offense", "3rd Offense"],
    [
      ["Hazmat Out-of-Service (OOS)", "$1,000", "$1,500", "Termination"],
      ["Hazmat Non-OOS", "$250", "$500", ""],
      ["Logbook/ELD Out-of-Service", "$500", "$1,000", "Termination"],
      ["Logbook/ELD Non-OOS", "$250", "$500", ""],
      ["Vehicle Out-of-Service", "$300", "$600", "Termination"],
      ["Vehicle Non-OOS", "$150", "$300", ""],
      ["Unsafe Driving", "$750", "$1,000", "Termination"],
      ["Driver Fitness (OOS or Non-OOS)", "$250", "$500", ""],
    ],
    [204, 104, 104, contentW - 204 - 104 - 104],
  );
  para(`C) To encourage safe operations, the Company shall provide the following bonuses for clean (no violation) DOT roadside inspections, paid the next settlement following submission of the inspection report:`);
  table(
    ["Inspection Level", "Load Type", "Bonus for No Violations"],
    [
      ["Level I", "Hazmat", "$1,000"],
      ["Level I", "Non-Hazmat", "$300"],
      ["Level II", "Hazmat", "$250"],
      ["Level II", "Non-Hazmat", "$150"],
      ["Level III", "All Loads", "$100"],
    ],
    [172, 172, contentW - 172 - 172],
  );

  // 9. Duties and Responsibilities
  sectionHeading(9, "Duties and Responsibilities");
  para(`Contractor shall perform transportation services in a professional, safe, and lawful manner and shall have the following duties and responsibilities:`);
  richPara([{ t: "(a) Compliance with Laws and Regulations: ", b: true }, { t: "Contractor shall comply with all applicable federal, state, and local laws and regulations, including but not limited to Federal Motor Carrier Safety Administration (FMCSA) regulations, hours-of-service rules, driver qualification requirements, drug and alcohol testing (if applicable), vehicle inspection and maintenance standards, and hazardous materials regulations." }]);
  richPara([{ t: "(b) Safe Operation and Cargo Handling: ", b: true }, { t: "Contractor shall operate the equipment safely and ensure that all freight is properly loaded, secured, blocked, braced, and transported in accordance with FMCSA cargo securement rules and shipper instructions. Contractors shall inspect cargo at pickup and delivery, report any damage or discrepancies immediately, and take reasonable measures to protect freight from loss, damage, or theft." }]);
  richPara([{ t: "(c) Professional Conduct: ", b: true }, { t: "Contractor shall conduct themselves professionally at all shippers, receivers, brokers, and other facilities. This includes arriving on time, communicating courteously, following site-specific instructions, and representing the Company in a positive manner. Contractor shall not engage in behavior that could damage the Company's reputation or relationships with customers." }]);
  richPara([{ t: "(d) Personal Protective Equipment (PPE) and Safety: ", b: true }, { t: "Contractor shall wear and use appropriate PPE as required by shipper/receiver facilities, OSHA standards, or Company policy (e.g., hard hats, safety vests, steel-toed boots, gloves). Contractor shall follow all safety protocols at loading/unloading sites." }]);
  richPara([{ t: "(e) Company Policies: ", b: true }, { t: "Contractor agrees to adhere to all Company policies and procedures provided in writing, including but not limited to safety policies, communication protocols, tracking requirements, and incident reporting procedures." }]);
  richPara([{ t: "(f) Driver Qualifications: ", b: true }, { t: "Contractor (and any drivers operating under this Agreement) shall maintain a valid Commercial Driver's License (CDL), medical examiner's certificate, and clean driving record as required by law. Contractor shall immediately notify the Company of any citations, accidents, license suspensions, or changes in driving status." }]);
  para(`Contractor acknowledges that failure to fulfill these duties may result in load rejection, termination of this Agreement for cause, or liability for damages.`);

  // 10. Camera Use and Maintenance
  sectionHeading(10, "Independent Contractor Driver Responsibilities for Camera Use and Maintenance");
  richPara([{ t: `Contractor must ensure that all Company-installed cameras are operational, unobstructed, securely mounted, and powered at all times while operating under ${co}'s authority.` }]);
  para(`A daily visual inspection of the camera system must be conducted prior to operation, verifying that:`);
  bullet("Cameras are powered on and functioning;");
  bullet("Lenses are clean and free of obstruction;");
  bullet("Wiring and mounts are intact.");
  y -= 3;
  richPara([{ t: `Any malfunction, tampering, or damage must be promptly reported to ${co}'s Safety Department. Tampering with, disabling, covering, or misusing the camera system is strictly prohibited. Violations may result in termination of the business relationship, deductions for equipment damage, or legal reporting where applicable. Upon termination of operations under ${co}'s authority, all Company equipment must be returned in working condition, subject to reasonable wear and tear. Failure to return equipment may result in deductions to the extent permitted by law. Contractor is financially responsible for loss, theft, or damage resulting from negligence or misuse.` }]);
  subHeading("Company Responsibilities");
  richPara([{ t: `${co} is responsible for ensuring that camera systems are properly maintained, for securing and managing access to data, and for adhering to all applicable federal and state laws concerning privacy, biometric information, and data protection.` }]);
  subHeading("Consent to Collection of Biometric Data");
  richPara([{ t: `${co} utilizes Samsara's hardware and software, including the Camera ID feature, to improve safety and operational efficiency. Camera ID collects, stores, and processes facial recognition information for the limited purposes of associating Independent Contractor Drivers with vehicles, trips, and safety events within the Samsara dashboard. Biometric data may be stored and processed via Samsara. Camera ID information is retained for up to 184 days after deactivation from ${co}'s Samsara account or after Camera ID functionality is disabled, whichever is earlier. After that, all biometric data will be permanently deleted. Further information on Camera ID and biometric data practices is available through Samsara's published privacy documentation. A copy of ${co}'s Biometric Data Retention and Deletion Policy are available upon request.` }]);
  para(`By signing below, the undersigned expressly consents to ${co}'s and Samsara's collection, use, retention, and destruction of biometric data as described herein.`);
  subHeading("Biometric Data Retention and Deletion Policy");
  richPara([{ t: "Purpose — ", b: true }, { t: `${co} uses biometric technologies, through Samsara's Camera ID system, to enhance safety and operational integrity. The purpose of this Policy is to ensure compliance with applicable laws, including the Illinois Biometric Information Privacy Act (BIPA).` }]);
  richPara([{ t: "Policy — ", b: true }, { t: `Biometric data collected by ${co} will be stored securely and will not be sold, leased, traded, or otherwise disclosed except as required by law or authorized in writing by the individual. Biometric data will be retained only as long as necessary to fulfill the purposes stated herein and in accordance with the retention timelines below.` }]);
  richPara([{ t: "Retention and Destruction — ", b: true }, { t: `Biometric data shall be retained until 184 days after the individual is deactivated from ${co}'s Samsara account or after Camera ID functionality is disabled. Thereafter, all biometric data will be permanently and securely deleted.` }]);
  richPara([{ t: "Review and Amendments — ", b: true }, { t: `${co} may periodically review and amend this Policy to comply with changes in law, regulations, or operational needs. Updates will be communicated in writing.` }]);

  // 11. Truck and Trailer Use
  sectionHeading(11, "Truck and Trailer Use");
  para(`Contractor agrees to use only the specific commercial motor vehicle(s) and/or trailer(s) ("Equipment") assigned by the Company for the performance of services under this Agreement, unless prior written authorization is obtained from the Company's Fleet Department.`);
  para(`Unauthorized substitution, exchange, transfer, relocation, or drop-off of Equipment is strictly prohibited. Prior to dropping off, relocating, or leaving any Equipment at any location, Contractor shall contact the Fleet Department for approval and instructions.`);
  para(`At the time of any approved drop-off, Contractor shall take and submit clear, close-up photographs of the Equipment from all sides (front, rear, left, and right) to the Fleet Department.`);
  para(`Leaving Equipment at any location without prior Fleet Department approval shall constitute non-compliance with this Agreement and may result in disciplinary action, deduction of recovery or towing charges from settlements, or other contractual remedies. Contractor agrees to cooperate fully with the Fleet Department to ensure safe, timely, and proper handling and transfer of Equipment.`);
  para(`Contractor shall be financially responsible for any costs, damages, delays, towing, or recovery expenses arising from unauthorized drop-offs, relocations, or failure to follow Fleet Department instructions. The Fleet Department retains authority to enforce these procedures to maintain operational efficiency, safety, regulatory compliance, and accurate tracking of Equipment.`);
  para(`Upon completion of services or termination of this Agreement, Contractor shall return all assigned Equipment in clean, operational condition and with all Company-issued assets, devices, placards, and documents intact. If Equipment is left without proper notification and approval, daily rental or usage charges shall continue to accrue until the Fleet Department is notified and regains possession. The Company reserves the right to deduct any associated costs, recovery fees, towing charges, or damages from Contractor's settlements.`);

  // 12. Termination
  sectionHeading(12, "Termination");
  para(`This Agreement may be terminated as follows:`);
  richPara([{ t: "(a) ", b: true }, { t: "Either party may terminate this Agreement without cause by providing fourteen (14) days' prior written notice to the other party. Contractor specifically agrees to provide at least fourteen (14) days' written notice if electing to terminate the Agreement." }]);
  richPara([{ t: "(b) ", b: true }, { t: "The Company may terminate this Agreement immediately, without prior notice, for cause, including but not limited to: material breach of this Agreement, safety violations, out-of-service orders, failure to comply with laws or Company policies, falsification of records, involvement in accidents determined to be preventable, or conduct that damages the Company's reputation or customer relationships." }]);
  richPara([{ t: "(c) ", b: true }, { t: "Upon termination (for any reason), Contractor shall immediately return all Company property (including identification signs, placards, trailers, devices, and any other equipment), complete any loads in progress (unless otherwise directed), and submit all required documentation. The Company shall remove its identification from the equipment, provide a receipt for returned property, and issue final settlement of all outstanding compensation within fifteen (15) days, subject to authorized deductions and chargebacks." }]);

  // 13. Acknowledgment
  sectionHeading(13, "Acknowledgment");
  para(`Contractor acknowledges and agrees as follows:`);
  para(`(a) I have carefully read this entire Agreement, including all exhibits, addendums, and attached policies, and fully understand its contents and legal effect.`);
  para(`(b) I understand that this Agreement creates an independent contractor relationship and that I am not an employee of the Company.`);
  para(`(c) I have been provided with full disclosure of the method of compensation, including percentage rates, bonuses, detention/TONU pass-through, deductions, chargebacks, fees, insurance responsibilities, deductibles, safety penalties, and incentives as detailed herein.`);
  para(`(d) I agree to comply with all duties, responsibilities, safety requirements, reporting obligations, and Company policies outlined in this Agreement.`);
  para(`(e) This Agreement contains the entire understanding between the parties and supersedes all prior discussions or agreements. I enter into this Agreement freely and voluntarily, without duress. By signing below, Contractor confirms the above acknowledgments and agrees to be bound by all terms and conditions of this Agreement.`);

  // ── Signature block ──
  ensure(90);
  y -= 10;
  page.drawText("Contractor:", { x: margin, y, size: 10, font: bold, color: DARK });
  y -= 28;
  const nameLineW = 200, sigLineW = 180, dateLineW = contentW - nameLineW - sigLineW - 24;
  // signature image on the middle line
  if (d.signerSignature && d.signerSignature.startsWith("data:image")) {
    try {
      const png = await pdf.embedPng(dataUrlToBytes(d.signerSignature));
      const sx = margin + nameLineW + 12;
      const s = Math.min((sigLineW - 8) / png.width, 26 / png.height);
      page.drawImage(png, { x: sx + (sigLineW - png.width * s) / 2, y: y + 2, width: png.width * s, height: png.height * s });
    } catch { /* ignore */ }
  }
  if (d.signerName) page.drawText(d.signerName, { x: margin + 4, y: y + 2, size: 10, font, color: DARK });
  if (d.signedAt) page.drawText(mdY(d.signedAt), { x: margin + nameLineW + sigLineW + 24 + 4, y: y + 2, size: 10, font, color: DARK });
  // lines + captions
  page.drawLine({ start: { x: margin, y }, end: { x: margin + nameLineW, y }, thickness: 0.8, color: DARK });
  page.drawLine({ start: { x: margin + nameLineW + 12, y }, end: { x: margin + nameLineW + 12 + sigLineW, y }, thickness: 0.8, color: DARK });
  page.drawLine({ start: { x: margin + nameLineW + sigLineW + 24, y }, end: { x: margin + contentW, y }, thickness: 0.8, color: DARK });
  y -= 12;
  page.drawText("Name", { x: margin + (nameLineW - w("Name", 9)) / 2, y, size: 9, font, color: GRAY });
  page.drawText("Signature", { x: margin + nameLineW + 12 + (sigLineW - w("Signature", 9)) / 2, y, size: 9, font, color: GRAY });
  page.drawText("Date", { x: margin + nameLineW + sigLineW + 24 + (dateLineW - w("Date", 9)) / 2, y, size: 9, font, color: GRAY });

  // ── Footers on every page ──
  const genStr = `Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`;
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: margin, y: 40 }, end: { x: right, y: 40 }, thickness: 0.5, color: rgb(0.8, 0.83, 0.88) });
    p.drawText(`${co} — Driver Independent Contractor Agreement`, { x: margin, y: 29, size: 7.5, font, color: GRAY });
    const pg = `Page ${i + 1} of ${pages.length}`;
    p.drawText(pg, { x: (W - w(pg, 7.5)) / 2, y: 29, size: 7.5, font, color: GRAY });
    p.drawText(genStr, { x: right - w(genStr, 7.5), y: 29, size: 7.5, font, color: GRAY });
  });

  // ── Certificate (only once signed) ──
  if (d.signedAt) {
    await appendCertificate(pdf, font, bold, {
      envelopeId: d.envelopeId,
      documentTitle: `Driver Independent Contractor Agreement — ${d.signerName ?? d.contractorName}`,
      logo: d.companyLogo,
      signers: [
        { label: "Contractor", name: d.signerName ?? d.contractorName, at: fmt(d.signedAt), ip: d.signerIp ?? "unknown" },
      ],
    });
  }

  return pdf.save();
}
