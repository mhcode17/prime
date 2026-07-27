// Provider-agnostic interfaces for third-party screening services.
// Swap the mock implementations in ./index.ts for real API clients later
// (Samba Safety, FMCSA Clearinghouse) without touching call sites.

export interface DriverContext {
  driverId: string;
  firstName: string;
  lastName: string;
  licenseNumber: string | null;
  licenseState: string | null;
}

export interface Violation {
  date: string; // ISO
  code: string;
  description: string;
  severity: "minor" | "major" | "serious";
  points?: number;
}

export interface ScreeningResult {
  externalRef: string;
  violationCount: number;
  violations: Violation[];
  summary: string;
  status: "COMPLETED" | "FAILED";
}

export interface ScreeningProvider {
  readonly name: string;
  orderPSP(driver: DriverContext): Promise<ScreeningResult>;
  orderMVR(driver: DriverContext): Promise<ScreeningResult>;
}

export interface ClearinghouseResult {
  externalRef: string;
  status: "COMPLETED_CLEAR" | "COMPLETED_VIOLATION";
  violations: {
    date: string;
    type: string;
    description: string;
  }[];
  summary: string;
}

export interface ClearinghouseProvider {
  readonly name: string;
  query(
    driver: DriverContext,
    type: "PRE_EMPLOYMENT_FULL" | "LIMITED" | "ANNUAL",
  ): Promise<ClearinghouseResult>;
}
