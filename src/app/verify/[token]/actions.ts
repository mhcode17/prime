"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { VEHICLE_TYPES, DA_QUESTIONS, CHARACTERISTICS, type Accident } from "@/lib/sph";

const tri = (v: FormDataEntryValue | null) =>
  v === "yes" ? true : v === "no" ? false : null;

/**
 * Public submission by a prior employer via the tokenized link — captures the
 * full FMCSA Safety Performance History form (Parts 2-4).
 */
export async function submitVerification(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const token = String(formData.get("token") ?? "");
  if (!token) return { error: "Invalid link" };

  const exp = await prisma.driverExperience.findFirst({
    where: { verificationToken: token },
  });
  if (!exp) return { error: "This link is invalid or has expired." };
  if (exp.respondedAt) return { error: "This verification has already been submitted." };

  const clamp = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);
  const responderName = clamp(formData.get("responderName"), 200);
  const responderTitle = clamp(formData.get("responderTitle"), 200);
  const signature = String(formData.get("signature") ?? "").trim();
  const consent = formData.get("consent");
  if (!responderName) return { error: "Please enter your name" };
  if (!signature) return { error: "Please sign at the bottom" };
  if (signature.length > 2_000_000) return { error: "Signature image is too large." };
  if (!consent) return { error: "Please confirm the information is accurate" };

  // Part 2 — accidents table
  const accidents: Accident[] = [];
  for (let i = 0; i < 3; i++) {
    const row: Accident = {
      date: String(formData.get(`accident_${i}_date`) ?? "").trim(),
      location: String(formData.get(`accident_${i}_location`) ?? "").trim(),
      injuries: String(formData.get(`accident_${i}_injuries`) ?? "").trim(),
      fatalities: String(formData.get(`accident_${i}_fatalities`) ?? "").trim(),
      hazmat: String(formData.get(`accident_${i}_hazmat`) ?? "").trim(),
    };
    if (row.date || row.location || row.injuries || row.fatalities || row.hazmat) {
      accidents.push(row);
    }
  }
  const vehicleTypes = VEHICLE_TYPES.filter(
    (v) => formData.get(`vehicle_${v.key}`) === "on",
  ).map((v) => v.key);

  // Part 3 — drug & alcohol
  const daNoInfo = formData.get("noDrugAlcoholInfo") === "on";
  const daVals: Record<string, boolean | null> = {};
  for (const q of DA_QUESTIONS) daVals[q.key] = tri(formData.get(`da_${q.key}`));
  const anyDaViolation =
    daVals.daAlcoholTest === true ||
    daVals.daPositiveTest === true ||
    daVals.daRefusals === true ||
    daVals.daOtherViolations === true;

  // Part 4 — characteristics ratings
  const ratings: Record<string, string> = {};
  for (const c of CHARACTERISTICS) {
    const v = String(formData.get(`rating_${c.key}`) ?? "");
    if (v) ratings[c.key] = v;
  }

  const startStr = String(formData.get("confirmedStartDate") ?? "");
  const endStr = String(formData.get("confirmedEndDate") ?? "");

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    "unknown";

  await prisma.driverExperience.update({
    where: { id: exp.id },
    data: {
      verificationStatus: "VERIFIED",
      verificationMethod: "online",
      respondedAt: new Date(),
      responderIp: ip,
      responderName,
      responderTitle: responderTitle || null,
      responderSignature: signature,
      verifiedByName: responderName,
      verifiedAt: new Date(),

      // Part 2
      employedByUs: tri(formData.get("employedByUs")),
      confirmedStartDate: startStr ? new Date(startStr) : null,
      confirmedEndDate: endStr ? new Date(endStr) : null,
      didDriveVehicle: tri(formData.get("didDriveVehicle")),
      vehicleTypes,
      vehicleTypeOther: String(formData.get("vehicleTypeOther") ?? "").trim() || null,
      reasonForLeavingType: String(formData.get("reasonForLeavingType") ?? "").trim() || null,
      noSafetyHistory: formData.get("noSafetyHistory") === "on",
      accidents: accidents.length ? accidents : undefined,
      otherAccidents: String(formData.get("otherAccidents") ?? "").trim() || null,
      accidentRemarks: String(formData.get("accidentRemarks") ?? "").trim() || null,
      eligibleForRehire: tri(formData.get("eligibleForRehire")),

      // Part 3
      noDrugAlcoholInfo: daNoInfo,
      daAlcoholTest: daVals.daAlcoholTest,
      daPositiveTest: daVals.daPositiveTest,
      daRefusals: daVals.daRefusals,
      daOtherViolations: daVals.daOtherViolations,
      daSapSubsequent: daVals.daSapSubsequent,

      // Part 4
      ratings: Object.keys(ratings).length ? ratings : undefined,

      // Derived (for the summary badges / legacy)
      datesConfirmed: startStr ? true : null,
      drugAlcoholViolation: daNoInfo ? null : anyDaViolation,
      dotRecordableAccident: accidents.length > 0,
      dotAccidentDetails: String(formData.get("otherAccidents") ?? "").trim() || null,
      verificationNotes: String(formData.get("accidentRemarks") ?? "").trim() || null,
    },
  });

  return { ok: true };
}
