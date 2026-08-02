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

export function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getSlaStatus(
  submittedAt: Date,
  resolvedAt: Date | null
): "ok" | "warning" | "breached" {
  const now = new Date();
  const deadline = new Date(submittedAt.getTime() + 2 * 24 * 60 * 60 * 1000);
  if (resolvedAt) return "ok";
  if (now > deadline) return "breached";
  const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursLeft < 8) return "warning";
  return "ok";
}
