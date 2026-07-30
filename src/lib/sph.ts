// Shared option lists for the FMCSA Safety Performance History Records Request
// form (§391.23 / §40.25). Used by the public verification form and the PDF.

export const VEHICLE_TYPES = [
  { key: "straight_truck", label: "Straight Truck" },
  { key: "tractor_semitrailer", label: "Tractor-Semitrailer" },
  { key: "bus", label: "Bus" },
  { key: "cargo_tank", label: "Cargo Tank" },
  { key: "doubles_triples", label: "Doubles/Triples" },
  { key: "other", label: "Other" },
] as const;

export const REASONS = [
  { key: "DISCHARGED", label: "Discharged" },
  { key: "RESIGNATION", label: "Resignation" },
  { key: "LAYOFF", label: "Lay Off" },
  { key: "MILITARY", label: "Military Duty" },
  { key: "OTHER", label: "Other" },
] as const;

export const CHARACTERISTICS = [
  { key: "disposition", label: "Disposition, Tact, Getting along" },
  { key: "initiative", label: "Initiative, Resourcefulness" },
  { key: "safetyHabits", label: "Safety Habits" },
  { key: "drivingSkill", label: "Driving Skill" },
  { key: "attitude", label: "Attitude" },
  { key: "loyalty", label: "Loyalty" },
] as const;

export const RATING_OPTIONS = ["EXCELLENT", "GOOD", "FAIR", "POOR"] as const;

export const DA_QUESTIONS = [
  { key: "daAlcoholTest", label: "Any alcohol test with a result of 0.04 or higher?" },
  { key: "daPositiveTest", label: "Any verified positive drug test?" },
  { key: "daRefusals", label: "Any refusals to be tested (including verified adulterated or substituted results)?" },
  { key: "daOtherViolations", label: "Any other violations of DOT drug & alcohol testing regulations (Part 382 or Part 40)?" },
  { key: "daSapSubsequent", label: "If the driver completed a SAP referral and remained employed, any subsequent violations?" },
] as const;

export type Accident = {
  date: string;
  location: string;
  injuries: string;
  fatalities: string;
  hazmat: string;
};
export type Ratings = Record<string, string>; // characteristic key -> rating

export function vehicleLabel(key: string): string {
  return VEHICLE_TYPES.find((v) => v.key === key)?.label ?? key;
}
export function reasonLabel(key: string | null | undefined): string {
  return REASONS.find((r) => r.key === key)?.label ?? "—";
}
