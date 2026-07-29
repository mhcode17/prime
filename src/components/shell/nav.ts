// Navigation definitions per role.
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  UserX,
  FileSignature,
  ShieldCheck,
  FlaskConical,
  Building2,
  CalendarClock,
  Truck,
  Container,
  MessagesSquare,
  ClipboardCheck,
  UserCog,
  Settings,
  LifeBuoy,
  Briefcase,
} from "lucide-react";
import type { PermissionKey } from "@/lib/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  perm?: PermissionKey; // required permission (managers); owners always see it
  ownerOnly?: boolean; // only company owners see it
  orgAdminOnly?: boolean; // only organization admins see it
  children?: { label: string; href: string; icon: LucideIcon }[];
}

export const companyNav: NavItem[] = [
  { label: "Dashboard", href: "/company", icon: LayoutDashboard },
  {
    label: "Drivers",
    href: "/company/drivers",
    icon: Users,
    perm: "drivers",
    children: [
      { label: "All Drivers", href: "/company/drivers", icon: Users },
      { label: "Pending Drivers", href: "/company/drivers/pending", icon: UserPlus },
      { label: "Terminated Drivers", href: "/company/drivers/terminated", icon: UserX },
    ],
  },
  { label: "Documents", href: "/company/documents", icon: FileSignature, perm: "documents" },
  { label: "Screening", href: "/company/screening", icon: ShieldCheck, perm: "screening" },
  { label: "Drug Tests", href: "/company/drug-tests", icon: FlaskConical, perm: "drugTests" },
  { label: "Clearinghouse", href: "/company/clearinghouse", icon: ClipboardCheck, perm: "clearinghouse" },
  { label: "Orientation", href: "/company/appointments", icon: CalendarClock, perm: "appointments" },
  { label: "Trucks", href: "/company/trucks", icon: Truck, perm: "equipment" },
  { label: "Trailers", href: "/company/trailers", icon: Container, perm: "equipment" },
  { label: "Messages", href: "/company/messages", icon: MessagesSquare, perm: "messages" },
  { label: "Support", href: "/company/support", icon: LifeBuoy },
  { label: "Companies", href: "/company/organization", icon: Building2, orgAdminOnly: true },
  { label: "Team & Access", href: "/company/staff", icon: UserCog, orgAdminOnly: true },
  { label: "Company Settings", href: "/company/settings", icon: Settings, ownerOnly: true },
];

export const driverNav: NavItem[] = [
  { label: "Dashboard", href: "/driver", icon: LayoutDashboard },
  { label: "Documents to Sign", href: "/driver/documents", icon: FileSignature },
  { label: "Experience", href: "/driver/experience", icon: Briefcase },
  { label: "Screening & Tests", href: "/driver/screening", icon: ShieldCheck },
  { label: "Orientation", href: "/driver/appointments", icon: CalendarClock },
  { label: "My Equipment", href: "/driver/equipment", icon: Truck },
  { label: "Messages", href: "/driver/messages", icon: MessagesSquare },
];

export const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Companies", href: "/admin/companies", icon: Building2 },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Support Tickets", href: "/admin/tickets", icon: LifeBuoy },
];

export type ShellRole = "COMPANY" | "DRIVER" | "ADMIN";

export const NAV_BY_ROLE: Record<ShellRole, NavItem[]> = {
  COMPANY: companyNav,
  DRIVER: driverNav,
  ADMIN: adminNav,
};

/** Returns the nav items visible to the current user, applying company
 *  owner/permission filtering. Used by both the desktop and mobile menus. */
export function getNavItems(
  role: ShellRole,
  opts: { permissions?: string[]; isOwner?: boolean; isOrgAdmin?: boolean } = {},
): NavItem[] {
  const { permissions = [], isOwner = false, isOrgAdmin = false } = opts;
  const all = NAV_BY_ROLE[role] ?? [];
  if (role !== "COMPANY") return all;
  return all.filter((item) => {
    if (item.orgAdminOnly) return isOrgAdmin;
    if (item.ownerOnly) return isOwner;
    if (item.perm) return isOwner || permissions.includes(item.perm);
    return true;
  });
}
