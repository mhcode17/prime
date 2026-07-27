// Field-type metadata + auto-fill resolution. Pure (no server-only / prisma)
// so it can be shared by the editor, signer, PDF generator and server actions.

export type FieldType =
  | "SIGNATURE"
  | "INITIALS"
  | "DATE_SIGNED"
  | "FULL_NAME"
  | "DATE_OF_BIRTH"
  | "LICENSE_NUMBER"
  | "LICENSE_STATE"
  | "ADDRESS"
  | "PHONE"
  | "EMAIL"
  | "TEXT";

export type FieldCategory = "signature" | "auto" | "input";

interface FieldMeta {
  type: FieldType;
  label: string;
  category: FieldCategory;
  // default size as a fraction of page dimensions
  defaultW: number;
  defaultH: number;
}

export const FIELD_META: Record<FieldType, FieldMeta> = {
  SIGNATURE: { type: "SIGNATURE", label: "Signature", category: "signature", defaultW: 0.24, defaultH: 0.06 },
  INITIALS: { type: "INITIALS", label: "Initials", category: "signature", defaultW: 0.1, defaultH: 0.05 },
  DATE_SIGNED: { type: "DATE_SIGNED", label: "Date signed", category: "auto", defaultW: 0.16, defaultH: 0.035 },
  FULL_NAME: { type: "FULL_NAME", label: "Full name", category: "auto", defaultW: 0.24, defaultH: 0.035 },
  DATE_OF_BIRTH: { type: "DATE_OF_BIRTH", label: "Date of birth", category: "auto", defaultW: 0.16, defaultH: 0.035 },
  LICENSE_NUMBER: { type: "LICENSE_NUMBER", label: "License number", category: "auto", defaultW: 0.2, defaultH: 0.035 },
  LICENSE_STATE: { type: "LICENSE_STATE", label: "License state", category: "auto", defaultW: 0.1, defaultH: 0.035 },
  ADDRESS: { type: "ADDRESS", label: "Address", category: "auto", defaultW: 0.32, defaultH: 0.035 },
  PHONE: { type: "PHONE", label: "Phone", category: "auto", defaultW: 0.18, defaultH: 0.035 },
  EMAIL: { type: "EMAIL", label: "Email", category: "auto", defaultW: 0.26, defaultH: 0.035 },
  TEXT: { type: "TEXT", label: "Text (driver fills)", category: "input", defaultW: 0.24, defaultH: 0.035 },
};

export const FIELD_TYPES = Object.keys(FIELD_META) as FieldType[];

export interface SignerData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: Date | string | null;
  licenseNumber: string | null;
  licenseState: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

function fmtDate(d: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
}

/** Resolve the text value for an auto-fill field from the signer's profile. */
export function resolveAutoField(
  type: FieldType,
  signer: SignerData,
  signedAt: Date,
): string {
  switch (type) {
    case "DATE_SIGNED":
      return fmtDate(signedAt);
    case "FULL_NAME":
      return `${signer.firstName} ${signer.lastName}`.trim();
    case "DATE_OF_BIRTH":
      return fmtDate(signer.dateOfBirth);
    case "LICENSE_NUMBER":
      return signer.licenseNumber ?? "";
    case "LICENSE_STATE":
      return signer.licenseState ?? "";
    case "ADDRESS":
      return [signer.address, signer.city, signer.state, signer.zip]
        .filter(Boolean)
        .join(", ");
    case "PHONE":
      return signer.phone ?? "";
    case "EMAIL":
      return signer.email;
    default:
      return "";
  }
}

export function isAutoField(type: FieldType): boolean {
  return FIELD_META[type].category === "auto";
}
export function isSignatureField(type: FieldType): boolean {
  return FIELD_META[type].category === "signature";
}
export function isInputField(type: FieldType): boolean {
  return FIELD_META[type].category === "input";
}
