import "server-only";

// FMCSA QCMobile API — official carrier data by USDOT or MC (docket) number.
// Requires a free webKey: https://mobile.fmcsa.dot.gov/QCDevsite/docs/apiAccess
// Set FMCSA_WEBKEY in the environment. Without it, lookups return a clear error.

export interface CarrierInfo {
  legalName: string;
  dbaName: string | null;
  dotNumber: string | null;
  phone: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  allowedToOperate: string | null; // "Y" / "N"
}

const BASE = "https://mobile.fmcsa.dot.gov/qc/services/carriers";

export class CarrierLookupError extends Error {}

function webKey(): string {
  const k = process.env.FMCSA_WEBKEY;
  if (!k) {
    throw new CarrierLookupError(
      "Carrier lookup is not configured yet (missing FMCSA API key).",
    );
  }
  return k;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(c: any): CarrierInfo {
  return {
    legalName: c.legalName ?? c.dbaName ?? "",
    dbaName: c.dbaName ?? null,
    dotNumber: c.dotNumber != null ? String(c.dotNumber) : null,
    phone: c.telephone ?? null,
    street: c.phyStreet ?? null,
    city: c.phyCity ?? null,
    state: c.phyState ?? null,
    zip: c.phyZipcode ?? null,
    allowedToOperate: c.allowedToOperate ?? null,
  };
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    // FMCSA can be slow; don't cache lookups.
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new CarrierLookupError(`FMCSA API returned ${res.status}`);
  }
  return res.json();
}

/** Look up a carrier by USDOT number. Returns null if not found. */
export async function lookupByDot(dot: string): Promise<CarrierInfo | null> {
  const digits = dot.replace(/\D/g, "");
  if (!digits) return null;
  const data = (await getJson(`${BASE}/${digits}?webKey=${webKey()}`)) as
    | { content?: { carrier?: unknown } }
    | null;
  const carrier = data?.content?.carrier;
  return carrier ? normalize(carrier) : null;
}

export interface CarrierSummary {
  legalName: string;
  dotNumber: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
}

/** Search carriers by (partial) name — for autocomplete. Returns up to `limit`. */
export async function lookupByName(
  name: string,
  limit = 8,
): Promise<CarrierSummary[]> {
  const q = name.trim();
  if (q.length < 2) return [];
  const data = (await getJson(
    `${BASE}/name/${encodeURIComponent(q)}?webKey=${webKey()}`,
  )) as { content?: unknown } | null;
  const content = data?.content;
  if (!Array.isArray(content)) return [];
  const seen = new Set<string>();
  const out: CarrierSummary[] = [];
  for (const item of content) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = (item as any)?.carrier ?? item;
    if (!c) continue;
    const legalName = c.legalName ?? c.dbaName;
    if (!legalName) continue;
    const key = `${legalName}|${c.dotNumber ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      legalName,
      dotNumber: c.dotNumber != null ? String(c.dotNumber) : null,
      city: c.phyCity ?? null,
      state: c.phyState ?? null,
      phone: c.telephone ?? null,
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** Look up a carrier by MC / docket number. Returns null if not found. */
export async function lookupByMc(mc: string): Promise<CarrierInfo | null> {
  const digits = mc.replace(/\D/g, "");
  if (!digits) return null;
  const data = (await getJson(
    `${BASE}/docket-number/${digits}?webKey=${webKey()}`,
  )) as { content?: unknown } | null;
  const content = data?.content;
  // docket-number endpoint returns a list.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const first: any = Array.isArray(content) ? content[0] : content;
  const carrier = first?.carrier ?? first;
  return carrier ? normalize(carrier) : null;
}
