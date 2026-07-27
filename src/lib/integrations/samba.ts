// Mock Samba Safety provider for PSP and MVR screening.
// Deterministic-ish results derived from driver identity so demos are stable.
import type {
  DriverContext,
  ScreeningProvider,
  ScreeningResult,
  Violation,
} from "./types";

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

const PSP_VIOLATIONS: Omit<Violation, "date">[] = [
  { code: "393.9", description: "Inoperable required lamp", severity: "minor", points: 2 },
  { code: "392.2S", description: "Speeding 6-10 mph over limit", severity: "major", points: 4 },
  { code: "395.8", description: "Record of duty status not current", severity: "serious", points: 5 },
  { code: "396.3", description: "Brake out of adjustment", severity: "major", points: 4 },
];

const MVR_VIOLATIONS: Omit<Violation, "date">[] = [
  { code: "SPD", description: "Speeding violation", severity: "major", points: 3 },
  { code: "FTY", description: "Failure to yield", severity: "major", points: 3 },
  { code: "IMP", description: "Improper lane change", severity: "minor", points: 2 },
];

function pick(seed: number, pool: Omit<Violation, "date">[]): Violation[] {
  const count = seed % 3; // 0, 1, or 2 violations
  const out: Violation[] = [];
  for (let i = 0; i < count; i++) {
    const v = pool[(seed + i) % pool.length];
    const d = new Date();
    d.setMonth(d.getMonth() - ((seed + i) % 24));
    out.push({ ...v, date: d.toISOString() });
  }
  return out;
}

class MockSambaProvider implements ScreeningProvider {
  readonly name = "samba_safety (mock)";

  private async run(
    driver: DriverContext,
    kind: "PSP" | "MVR",
    pool: Omit<Violation, "date">[],
  ): Promise<ScreeningResult> {
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 400));
    const seed = hash(`${kind}:${driver.driverId}:${driver.licenseNumber ?? ""}`);
    const violations = pick(seed, pool);
    return {
      externalRef: `${kind}-${seed.toString(36).toUpperCase()}`,
      violationCount: violations.length,
      violations,
      status: "COMPLETED",
      summary:
        violations.length === 0
          ? `No ${kind} records found — clean report.`
          : `${violations.length} ${kind} violation(s) found over the reporting period.`,
    };
  }

  orderPSP(driver: DriverContext) {
    return this.run(driver, "PSP", PSP_VIOLATIONS);
  }
  orderMVR(driver: DriverContext) {
    return this.run(driver, "MVR", MVR_VIOLATIONS);
  }
}

export const sambaProvider: ScreeningProvider = new MockSambaProvider();
