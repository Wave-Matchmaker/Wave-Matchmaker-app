import { useMemo, useState } from "react";
import {
  repoFromUrl,
  searchOpenIssues,
  type GithubIssueSearchItem,
} from "../lib/github";
import { suggestComplexity } from "../lib/match";
import { inputCls, LevelChip } from "./ui";

const LEVELS = ["Trivial", "Medium", "High"] as const;
type Level = (typeof LEVELS)[number];

interface Candidate {
  issue: GithubIssueSearchItem;
  repo: string;
  level: Level;
  points: number;
  confidence: number;
  signal: number; // community demand proxy: reactions + comments
}

interface PlanEntry {
  c: Candidate;
  funded: boolean;
  reason?: string;
}

interface PlanResult {
  entries: PlanEntry[];
  budget: number;
  used: number;
  totalCostAll: number;
  repoCap: number; // 0 = none
  fundedRepos: Set<string>;
}

function parseNumber(s: string): number {
  const n = Number(s.replace(/[,_\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

/** Greedy: fund best community-demand-per-point issues, honoring per-repo cap + budget. */
function buildPlan(candidates: Candidate[], budget: number, repoCap: number): PlanResult {
  const sorted = [...candidates].sort((a, b) => {
    const eff = (c: Candidate) => (c.points > 0 ? c.signal / c.points : 0);
    return eff(b) - eff(a) || b.signal - a.signal || a.points - b.points;
  });

  const entries: PlanEntry[] = [];
  const repoUsed = new Map<string, number>();
  let used = 0;
  const fundedRepos = new Set<string>();

  for (const c of sorted) {
    if (c.points > budget) {
      entries.push({ c, funded: false, reason: "Costs more than the whole Wave budget." });
      continue;
    }
    if (used + c.points > budget) {
      entries.push({
        c,
        funded: false,
        reason: `Budget exhausted — ${(budget - used).toLocaleString()} pts left.`,
      });
      continue;
    }
    if (repoCap > 0 && (repoUsed.get(c.repo) ?? 0) + c.points > repoCap) {
      entries.push({
        c,
        funded: false,
        reason: `Over the per-repo cap (${repoCap.toLocaleString()} pts) for ${c.repo}.`,
      });
      continue;
    }
    entries.push({ c, funded: true });
    used += c.points;
    repoUsed.set(c.repo, (repoUsed.get(c.repo) ?? 0) + c.points);
    fundedRepos.add(c.repo);
  }

  const totalCostAll = candidates.reduce((sum, c) => sum + c.points, 0);
  return { entries, budget, used, totalCostAll, repoCap, fundedRepos };
}

export default function BudgetOptimizer({ onBack }: { onBack: () => void }) {
  const [scope, setScope] = useState<"org" | "repo">("org");
  const [target, setTarget] = useState("");
  const [budgetInput, setBudgetInput] = useState("3000");
  const [repoCapInput, setRepoCapInput] = useState("");
  // Current Stellar Wave complexity values (Drips docs: points-and-rewards).
  const [points, setPoints] = useState<Record<Level, string>>({
    Trivial: "100",
    Medium: "150",
    High: "200",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPlan(null);

    const budget = parseNumber(budgetInput);
    if (!Number.isFinite(budget) || budget <= 0) {
      setError("Wave budget must be a positive number of points.");
      return;
    }
    const repoCap = repoCapInput.trim() === "" ? 0 : parseNumber(repoCapInput);
    if (repoCapInput.trim() !== "" && (!Number.isFinite(repoCap) || repoCap <= 0)) {
      setError("Per-repo cap must be blank or a positive number of points.");
      return;
    }
    const levelPoints = {} as Record<Level, number>;
    for (const level of LEVELS) {
      const n = parseNumber(points[level]);
      if (!Number.isFinite(n) || n <= 0) {
        setError(`Points for "${level}" must be a positive number.`);
        return;
      }
      levelPoints[level] = n;
    }

    const t = target.trim();
    if (!t) {
      setError(scope === "org" ? "Enter a GitHub org name." : "Enter a repo as owner/repo.");
      return;
    }
    if (scope === "repo" && !/^[\w.-]+\/[\w.-]+$/.test(t)) {
      setError('Repo scope needs "owner/repo" form, e.g. stellar/go.');
      return;
    }

    setLoading(true);
    try {
      const { items } = await searchOpenIssues(scope, t, 60);
      if (items.length === 0) {
        setPlan({
          entries: [],
          budget,
          used: 0,
          totalCostAll: 0,
          repoCap,
          fundedRepos: new Set(),
        });
        setError(null);
        return;
      }

      // Up to 60 of the org/repo's most recently-updated open issues.
      const candidates: Candidate[] = items.map((issue) => {
        const repo = repoFromUrl(issue.repository_url ?? issue.html_url);
        const complexity = suggestComplexity(issue);
        return {
          issue,
          repo: repo ?? t,
          level: complexity.level,
          points: levelPoints[complexity.level],
          confidence: complexity.confidence,
          signal: (issue.reactions?.total_count ?? 0) + issue.comments,
        };
      });

      setPlan(buildPlan(candidates, budget, repoCap));
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `No open issues found for ${scope === "org" ? "org" : "repo"} "${t}".`,
      );
    } finally {
      setLoading(false);
    }
  }

  const { funded, overBudget } = useMemo(() => {
    if (!plan) return { funded: [], overBudget: 0 };
    const funded = plan.entries.filter((e) => e.funded).map((e) => e.c);
    const overBudget = Math.max(0, plan.totalCostAll - plan.budget);
    return { funded, overBudget };
  }, [plan]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <button onClick={onBack} className="mb-6 text-sm text-slate-400 transition hover:text-white">
        ← Back to home
      </button>

      <h1 className="text-3xl font-bold">Points Budget Optimizer</h1>
      <p className="mt-2 max-w-3xl text-slate-400">
        Point a repo or org at this tool and it estimates every open issue's complexity,
        prices it, then funds the best community-demand-per-point set within your Wave
        budget and per-repo caps.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="flex flex-wrap gap-3">
          {(["org", "repo"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                scope === s
                  ? "bg-cyan-500 text-slate-950"
                  : "border border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              {s === "org" ? "Organization" : "Single repo"}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={scope === "org" ? "GitHub org (e.g. stellar)" : "owner/repo (e.g. stellar/go)"}
            required
            className={inputCls}
          />
          <input
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            placeholder="This Wave's points budget"
            className={inputCls}
          />
          <input
            value={repoCapInput}
            onChange={(e) => setRepoCapInput(e.target.value)}
            placeholder="Per-repo cap (blank = none)"
            className={inputCls}
          />
        </div>

        <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="w-full text-xs text-slate-500">
            Points per complexity level — defaults match the current Stellar Wave values
            (Trivial 100 / Medium 150 / High 200). Edit if your program differs.
          </p>
          {LEVELS.map((level) => (
            <label key={level} className="flex items-center gap-2 text-sm text-slate-300">
              <LevelChip level={level} />
              <input
                type="number"
                min={1}
                step={100}
                value={points[level]}
                onChange={(e) => setPoints((p) => ({ ...p, [level]: e.target.value }))}
                className="w-28 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
              <span className="text-xs text-slate-500">pts</span>
            </label>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
        >
          {loading ? "Optimizing…" : "Optimize budget"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      {plan && (
        <div className="mt-10 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="font-semibold text-white">Budget plan</h2>
            <div className="mt-4 flex flex-wrap gap-6 text-sm">
              <Stat label="Open issues found" value={plan.totalCostAll === 0 ? "0" : String(plan.entries.length)} />
              <Stat label="Issues funded" value={String(funded.length)} accent />
              <Stat label="Points used" value={`${plan.used.toLocaleString()} / ${plan.budget.toLocaleString()}`} />
              <Stat label="Repos used" value={String(plan.fundedRepos.size)} />
              {plan.repoCap > 0 && (
                <Stat label="Per-repo cap" value={plan.repoCap.toLocaleString()} />
              )}
            </div>

            {overBudget > 0 && (
              <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200/90">
                ⚠️ All {plan.totalCostAll > 0 ? plan.entries.length : 0} open issues would cost{" "}
                {plan.totalCostAll.toLocaleString()} pts — {overBudget.toLocaleString()} over
                budget. The optimizer funded the highest-demand subset; trim the bench below or
                relabel issues as less complex.
              </p>
            )}
            {plan.entries.length === 0 && (
              <p className="mt-4 text-sm text-slate-400">
                No open issues found{scope === "org" ? ` for org "${target.trim()}"` : ` in ${target.trim()}`} —
                try another scope, or check the org name.
              </p>
            )}
          </div>

          {plan.entries.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Issue</th>
                    <th className="px-4 py-3">Level</th>
                    <th className="px-4 py-3 text-right">Demand</th>
                    <th className="px-4 py-3 text-right">Points</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                  {plan.entries.map((e) => (
                    <tr key={e.c.issue.html_url} className={e.funded ? "" : "opacity-60"}>
                      <td className="px-4 py-3">
                        <p className="max-w-md truncate font-medium text-white">
                          <span className="text-slate-500">{e.c.repo}</span> ·{" "}
                          <a
                            href={e.c.issue.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                          >
                            #{e.c.issue.number} {e.c.issue.title}
                          </a>
                        </p>
                        {!e.funded && e.reason && (
                          <p className="mt-0.5 text-xs italic text-amber-300/80">{e.reason}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <LevelChip level={e.c.level} />
                        <span className="ml-2 text-xs text-slate-500">
                          {Math.round(e.c.confidence * 100)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        {e.c.signal > 0 ? `🔥 ${e.c.signal}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        {e.c.points.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {e.funded ? (
                          <span className="text-xs font-bold text-emerald-400">✓ Funded</span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-500">Bench</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-slate-500">
            Scans up to 60 of the org's most recently-updated open issues. Demand = reactions +
            comments on the issue (a rough community-interest proxy). Funding order: best
            demand-per-point first. Complexity comes from the same transparent v0 heuristic as the
            Match Score demo.
          </p>
        </div>
      )}
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${accent ? "text-cyan-300" : "text-white"}`}>{value}</p>
    </div>
  );
}
