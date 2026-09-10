import { useMemo, useState } from "react";
import {
  buildTimeline,
  prsToCsv,
  previousWindow,
  summarizePrs,
  type PrEstimate,
} from "../lib/analytics";
import { LEVELS, type ComplexityLevel } from "../lib/complexity";
import {
  repoFromUrl,
  searchMergedPrs,
  type GithubIssueSearchItem,
} from "../lib/github";
import { suggestComplexity } from "../lib/match";
import { inputCls, LevelChip } from "./ui";

const DAY = 86_400_000;

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseNumber(s: string): number {
  const n = Number(s.replace(/[,_\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function buildPrs(
  items: GithubIssueSearchItem[],
  levelPoints: Record<ComplexityLevel, number>,
): PrEstimate[] {
  const prs: PrEstimate[] = items.map((it) => {
    const c = suggestComplexity(it);
    return {
      repo: repoFromUrl(it.repository_url ?? it.html_url) ?? "unknown",
      number: it.number,
      title: it.title,
      html_url: it.html_url,
      level: c.level,
      points: levelPoints[c.level],
      mergedAt: it.pull_request?.merged_at ?? it.closed_at ?? "",
    };
  });
  prs.sort((a, b) => (a.mergedAt < b.mergedAt ? 1 : -1));
  return prs;
}

function downloadCsv(prs: PrEstimate[], filename: string) {
  const blob = new Blob([prsToCsv(prs)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface PrevResult {
  prs: PrEstimate[];
  total: number;
  start: string;
  end: string;
}

interface AnalyticsResult {
  prs: PrEstimate[];
  total: number; // search total (may exceed the 100 fetched)
  start: string;
  end: string;
  prev: PrevResult | null;
}

export default function Analytics({ onBack }: { onBack: () => void }) {
  const today = new Date();
  const [username, setUsername] = useState("");
  const [startInput, setStartInput] = useState(
    toISO(new Date(today.getTime() - 30 * DAY)),
  );
  const [endInput, setEndInput] = useState(toISO(today));
  // Current Stellar Wave complexity values (Drips docs: points-and-rewards).
  const [points, setPoints] = useState<Record<ComplexityLevel, string>>({
    Trivial: "100",
    Medium: "150",
    High: "200",
  });
  const [compare, setCompare] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyticsResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const user = username.trim();
    if (!user) {
      setError("Enter a GitHub username.");
      return;
    }
    if (!startInput || !endInput) {
      setError("Pick a start and end date for the wave window.");
      return;
    }
    if (startInput > endInput) {
      setError("Start date must be on or before the end date.");
      return;
    }
    const levelPoints = {} as Record<ComplexityLevel, number>;
    for (const level of LEVELS) {
      const n = parseNumber(points[level]);
      if (!Number.isFinite(n) || n <= 0) {
        setError(`Points for "${level}" must be a positive number.`);
        return;
      }
      levelPoints[level] = n;
    }

    setLoading(true);
    try {
      const prevWindow = compare ? previousWindow(startInput, endInput) : null;
      const [cur, prevRes] = await Promise.all([
        searchMergedPrs(user, startInput, endInput),
        prevWindow
          ? searchMergedPrs(user, prevWindow.start, prevWindow.end)
          : Promise.resolve(null),
      ]);
      const prs = buildPrs(cur.items, levelPoints);
      const prev =
        prevWindow && prevRes
          ? {
              prs: buildPrs(prevRes.items, levelPoints),
              total: prevRes.total,
              start: prevWindow.start,
              end: prevWindow.end,
            }
          : null;
      setResult({ prs, total: cur.total, start: startInput, end: endInput, prev });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const summary = useMemo(
    () => (result ? summarizePrs(result.prs) : null),
    [result],
  );
  const timeline = useMemo(
    () => (result ? buildTimeline(result.prs, result.start, result.end) : []),
    [result],
  );
  const maxPoints = Math.max(1, ...timeline.map((t) => t.points));
  const comparison = useMemo(() => {
    if (!result?.prev || !summary) return null;
    const prevSummary = summarizePrs(result.prev.prs);
    const delta = summary.totalPoints - prevSummary.totalPoints;
    const pct =
      prevSummary.totalPoints > 0
        ? Math.round((delta / prevSummary.totalPoints) * 100)
        : null;
    return { prevSummary, delta, pct };
  }, [result, summary]);
  const maxRepoPoints = summary?.repos[0]?.points ?? 1;

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <button
        onClick={onBack}
        className="mb-6 text-sm text-slate-400 transition hover:text-white"
      >
        ← Back to home
      </button>

      <h1 className="text-3xl font-bold">Private Analytics</h1>
      <p className="mt-2 max-w-3xl text-slate-400">
        Track your own points and impact over a Wave — no leaderboard needed
        (Drips sunset the public one in Wave 4). Enter your username and the
        wave window; we estimate points per merged PR with the same transparent
        heuristic as the other tools.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto_auto]">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="GitHub username (e.g. torvalds)"
            required
            className={inputCls}
          />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <span className="text-slate-500">From</span>
            <input
              type="date"
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <span className="text-slate-500">To</span>
            <input
              type="date"
              value={endInput}
              onChange={(e) => setEndInput(e.target.value)}
              className={inputCls}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {loading ? "Estimating…" : "Estimate points"}
          </button>
        </div>

        <label className="flex w-fit items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => setCompare(e.target.checked)}
            className="h-4 w-4 accent-cyan-500"
          />
          Compare with the previous period of the same length
        </label>

        <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="w-full text-xs text-slate-500">
            Points per complexity level — defaults match the current Stellar Wave
            values (Trivial 100 / Medium 150 / High 200). Edit if your program
            differs.
          </p>
          {LEVELS.map((level) => (
            <label
              key={level}
              className="flex items-center gap-2 text-sm text-slate-300"
            >
              <LevelChip level={level} />
              <input
                type="number"
                min={1}
                value={points[level]}
                onChange={(e) =>
                  setPoints((p) => ({ ...p, [level]: e.target.value }))
                }
                className="w-28 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
              <span className="text-xs text-slate-500">pts</span>
            </label>
          ))}
        </div>
      </form>

      {error && (
        <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      {result && summary && (
        <div className="mt-10 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="font-semibold text-white">Wave estimate</h2>
            <p className="mt-1 text-sm text-slate-500">
              @{username.trim()} · {result.start} → {result.end}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              <Stat label="PRs merged" value={String(result.prs.length)} />
              <Stat
                label="Points (estimate)"
                value={summary.totalPoints.toLocaleString()}
                accent
              />
              <Stat label="Repos touched" value={String(summary.repos.length)} />
              {summary.repos[0] && (
                <Stat
                  label="Top repo"
                  value={summary.repos[0].repo}
                />
              )}
              {summary.levelCounts.map(({ level, count }) => (
                <div key={level} className="flex items-center gap-2">
                  <LevelChip level={level} />
                  <span className="font-semibold text-white">× {count}</span>
                </div>
              ))}
            </div>
            {result.total > result.prs.length && (
              <p className="mt-4 text-xs text-slate-500">
                {result.total} merged PRs matched — showing the first{" "}
                {result.prs.length}.
              </p>
            )}
            {comparison && (
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-sm">
                <span className="text-slate-400">
                  Previous period ({result.prev!.start} → {result.prev!.end}):
                </span>
                <span className="font-semibold text-white">
                  {comparison.prevSummary.totalPoints.toLocaleString()} pts ·{" "}
                  {result.prev!.prs.length} PR
                  {result.prev!.prs.length === 1 ? "" : "s"}
                </span>
                <span
                  className={`font-bold ${
                    comparison.delta >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {comparison.delta >= 0 ? "▲ +" : "▼ "}
                  {comparison.delta.toLocaleString()} pts
                  {comparison.pct !== null &&
                    ` (${comparison.delta >= 0 ? "+" : ""}${comparison.pct}%)`}
                </span>
              </div>
            )}
          </div>

          {summary.repos.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="font-semibold text-white">
                Where your points come from
              </h3>
              <ul className="mt-4 space-y-3">
                {summary.repos.slice(0, 10).map((r) => (
                  <li key={r.repo}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-white">
                        {r.repo}
                      </span>
                      <span className="shrink-0 text-slate-400">
                        {r.points.toLocaleString()} pts · {r.count} PR
                        {r.count === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-blue-500"
                        style={{
                          width: `${Math.round((r.points / maxRepoPoints) * 100)}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {timeline.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="font-semibold text-white">Points over time</h3>
              <div className="mt-4 flex h-32 items-end gap-1">
                {timeline.map((t) => (
                  <div
                    key={t.date}
                    title={`${t.date}: ${t.points.toLocaleString()} pts (${t.count} PR${t.count === 1 ? "" : "s"})`}
                    className="flex-1"
                  >
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-cyan-600 to-cyan-400"
                      style={{
                        height: `${Math.max(2, Math.round((t.points / maxPoints) * 100))}%`,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>{timeline[0]?.date}</span>
                <span>{timeline[timeline.length - 1]?.date}</span>
              </div>
            </div>
          )}

          {result.prs.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">
                No merged PRs found for @{username.trim()} between{" "}
                {result.start} and {result.end} — try widening the window or
                checking the username.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 px-4 py-3">
                <h3 className="font-semibold text-white">
                  Merged PRs ({result.prs.length})
                </h3>
                <button
                  onClick={() =>
                    downloadCsv(
                      result.prs,
                      `wave-analytics-${username.trim()}-${result.start}-${result.end}.csv`,
                    )
                  }
                  className="rounded-lg bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-300 ring-1 ring-cyan-500/30 transition hover:bg-cyan-500/25"
                >
                  ⬇ Download CSV
                </button>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Merged</th>
                    <th className="px-4 py-3">PR</th>
                    <th className="px-4 py-3">Level</th>
                    <th className="px-4 py-3 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                  {result.prs.slice(0, 50).map((p) => (
                    <tr key={p.html_url}>
                      <td className="px-4 py-3 text-slate-400">
                        {p.mergedAt.slice(0, 10)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-xl truncate font-medium text-white">
                          <span className="text-slate-500">{p.repo}</span> ·{" "}
                          <a
                            href={p.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                          >
                            #{p.number} {p.title}
                          </a>
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <LevelChip level={p.level} />
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        {p.points.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-slate-500">
            Estimate only: points are the per-level base values (100 / 150 / 200)
            summed per merged PR, using the same transparent v0 complexity
            heuristic as the other tools. It excludes program-specific
            configuration like featured-repo multipliers, so treat it as a
            floor-to-near estimate and confirm against your own in-app standings.
          </p>
        </div>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-0.5 text-lg font-bold ${accent ? "text-cyan-300" : "text-white"}`}
      >
        {value}
      </p>
    </div>
  );
}