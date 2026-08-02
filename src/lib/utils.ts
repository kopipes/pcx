// Client-safe utilities — no Node.js imports

export function getNpsCategory(nps: number): "promoter" | "passive" | "detractor" {
  if (nps >= 9) return "promoter";
  if (nps >= 7) return "passive";
  return "detractor";
}

export function calculateNpsScore(responses: { nps: number | null }[]): number {
  const valid = responses.filter((r) => r.nps !== null) as { nps: number }[];
  if (valid.length === 0) return 0;
  const promoters = valid.filter((r) => r.nps >= 9).length;
  const detractors = valid.filter((r) => r.nps <= 6).length;
  return Math.round(((promoters - detractors) / valid.length) * 100);
}

export function calculateCsat(responses: { scoreOverall: number | null }[]): number {
  const valid = responses.filter((r) => r.scoreOverall !== null) as { scoreOverall: number }[];
  if (valid.length === 0) return 0;
  const satisfied = valid.filter((r) => r.scoreOverall >= 4).length;
  return Math.round((satisfied / valid.length) * 100);
}

export function isRiskResponse(response: {
  scoreOverall: number | null;
  nps: number | null;
}): boolean {
  return (
    (response.scoreOverall !== null && response.scoreOverall <= 2) ||
    (response.nps !== null && response.nps <= 6)
  );
}

export function toDate(val: Date | string | number | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === "number") {
    // If it looks like seconds (Unix timestamp < year 3000 in seconds), convert to ms
    return val < 9999999999 ? new Date(val * 1000) : new Date(val);
  }
  return new Date(val);
}

export function formatDate(date: Date | string | number | null | undefined): string {
  const d = toDate(date);
  if (!d) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];
  const mmm = months[d.getMonth()];
  const yyyy = d.getFullYear();
  return `${dd} ${mmm} ${yyyy}`;
}

export function formatDateTime(date: Date | string | number | null | undefined): string {
  const d = toDate(date);
  if (!d) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];
  const mmm = months[d.getMonth()];
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${dd} ${mmm} ${yyyy}, ${hh}:${mm}`;
}

export function getSlaStatus(
  submittedAt: Date | string | number,
  resolvedAt: Date | string | number | null
): "ok" | "warning" | "breached" {
  const now = new Date();
  const sub = toDate(submittedAt)!;
  const resolved = toDate(resolvedAt);
  const deadline = new Date(sub.getTime() + 2 * 24 * 60 * 60 * 1000);
  if (resolved) return "ok";
  if (now > deadline) return "breached";
  const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursLeft < 8) return "warning";
  return "ok";
}
