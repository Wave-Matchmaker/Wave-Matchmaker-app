import { LEVELS, type ComplexityLevel } from "./complexity";

/**
 * Private analytics aggregation (v0).
 *
 * Given per-PR point estimates, roll them up into totals, per-level counts,
 * per-repo rankings, and a points-over-time timeline for the wave window.
 */

export interface PrEstimate {
  repo: string; // owner/repo
  number: number;
  title: string;
  html_url: string;
  level: ComplexityLevel;
  points: number;
  mergedAt: string; // ISO timestamp
}

export interface TimelinePoint {
  date: string; // YYYY-MM-DD (day, or Monday of the week when bucketing weekly)
  points: number;
  count: number;
}

export interface PrSummary {
  totalPoints: number;
  levelCounts: { level: ComplexityLevel; count: number }[];
  repos: { repo: string; points: number; count: number }[];
}

const DAY = 86_400_000;

/**
 * Bucket PR points across the window [start, end] (inclusive, UTC).
 * Buckets daily; switches to Monday-start weeks when the window exceeds 60
 * days. Empty buckets are included so the timeline reads continuously.
 */
export function buildTimeline(
  prs: PrEstimate[],
  start: string,
  end: string,
): TimelinePoint[] {
  const startMs = new Date(`${start}T00:00:00Z`).getTime();
  const endMs = new Date(`${end}T23:59:59.999Z`).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs > endMs) {
    return [];
  }
  const weekly = Math.round((endMs - startMs) / DAY) > 60;

  const bucketKey = (iso: string): string => {
    const t = new Date(iso).getTime();
    if (weekly) {
      const day = (new Date(t).getUTCDay() + 6) % 7; // 0 = Monday
      return new Date(t - day * DAY).toISOString().slice(0, 10);
    }
    return new Date(t).toISOString().slice(0, 10);
  };

  const buckets = new Map<string, { points: number; count: number }>();
  for (const p of prs) {
    if (!p.mergedAt) continue;
    const key = bucketKey(p.mergedAt);
    const b = buckets.get(key) ?? { points: 0, count: 0 };
    b.points += p.points;
    b.count += 1;
    buckets.set(key, b);
  }

  const keys: string[] = [];
  if (weekly) {
    const first = bucketKey(new Date(startMs).toISOString());
    const firstMs = new Date(`${first}T00:00:00Z`).getTime();
    for (let t = firstMs; t <= endMs; t += 7 * DAY) {
      keys.push(new Date(t).toISOString().slice(0, 10));
    }
  } else {
    for (let t = startMs; t <= endMs; t += DAY) {
      keys.push(new Date(t).toISOString().slice(0, 10));
    }
  }

  return keys.map((date) => {
    const b = buckets.get(date);
    return { date, points: b?.points ?? 0, count: b?.count ?? 0 };
  });
}

export function summarizePrs(prs: PrEstimate[]): PrSummary {
  const levelCounts = LEVELS.map((level) => ({
    level,
    count: prs.filter((p) => p.level === level).length,
  }));
  const totalPoints = prs.reduce((sum, p) => sum + p.points, 0);

  const repoMap = new Map<string, { points: number; count: number }>();
  for (const p of prs) {
    const r = repoMap.get(p.repo) ?? { points: 0, count: 0 };
    r.points += p.points;
    r.count += 1;
    repoMap.set(p.repo, r);
  }
  const repos = [...repoMap.entries()]
    .map(([repo, v]) => ({ repo, ...v }))
    .sort((a, b) => b.points - a.points || a.repo.localeCompare(b.repo));

  return { totalPoints, levelCounts, repos };
}