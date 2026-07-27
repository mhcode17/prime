// Module-level permissions a company OWNER can grant to MANAGERs.
// OWNER implicitly has all of these plus staff & settings management.

export const PERMISSIONS = [
  { key: "drivers", label: "Drivers", desc: "View and manage drivers" },
  { key: "documents", label: "Documents", desc: "Create and send documents to sign" },
  { key: "screening", label: "Screening (PSP/MVR)", desc: "Order background screening" },
  { key: "drugTests", label: "Drug Tests", desc: "Order and record drug tests" },
  { key: "clearinghouse", label: "Clearinghouse", desc: "Run Clearinghouse queries" },
  { key: "appointments", label: "Orientation", desc: "Manage appointments and slots" },
  { key: "equipment", label: "Equipment", desc: "Manage trucks and trailers" },
  { key: "messages", label: "Messages", desc: "Chat with drivers" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSIONS.map((p) => p.key);

export type CompanyRole = "OWNER" | "MANAGER";

/** Owners can do everything; managers only what they've been granted. */
export function hasPermission(
  companyRole: CompanyRole | null | undefined,
  permissions: string[],
  key: PermissionKey,
): boolean {
  if (companyRole === "OWNER") return true;
  return permissions.includes(key);
}
