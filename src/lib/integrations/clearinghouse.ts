// Mock FMCSA Clearinghouse provider.
import type {
  ClearinghouseProvider,
  ClearinghouseResult,
  DriverContext,
} from "./types";

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

class MockClearinghouseProvider implements ClearinghouseProvider {
  readonly name = "fmcsa_clearinghouse (mock)";

  async query(
    driver: DriverContext,
    type: "PRE_EMPLOYMENT_FULL" | "LIMITED" | "ANNUAL",
  ): Promise<ClearinghouseResult> {
    await new Promise((r) => setTimeout(r, 500));
    const seed = hash(`CH:${driver.driverId}:${driver.licenseNumber ?? ""}`);
    // ~1 in 5 drivers flagged
    const hasViolation = seed % 5 === 0;

    if (!hasViolation) {
      return {
        externalRef: `CH-${seed.toString(36).toUpperCase()}`,
        status: "COMPLETED_CLEAR",
        violations: [],
        summary: `No drug & alcohol program violations found (${type}).`,
      };
    }

    const d = new Date();
    d.setMonth(d.getMonth() - (seed % 18));
    return {
      externalRef: `CH-${seed.toString(36).toUpperCase()}`,
      status: "COMPLETED_VIOLATION",
      violations: [
        {
          date: d.toISOString(),
          type: "Positive drug test",
          description: "Positive controlled-substances test result reported by prior employer.",
        },
      ],
      summary: `Violation found in Clearinghouse (${type}). Driver is prohibited until RTD process is complete.`,
    };
  }
}

export const clearinghouseProvider: ClearinghouseProvider =
  new MockClearinghouseProvider();
