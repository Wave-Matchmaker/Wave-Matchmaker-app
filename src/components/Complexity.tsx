import { useState } from "react";
import {
  fetchIssue,
  parseIssueUrl,
  type GithubIssue,
} from "../lib/github";
import { suggestComplexity, type ComplexitySuggestion } from "../lib/match";
import { LEVELS, summarizeAssessments, type ComplexityLevel } from "../lib/complexity";
import { inputCls, LevelChip } from "./ui";

interface Assessment {
  issue: GithubIssue;
  repo: string; // owner/repo
  complexity: ComplexitySuggestion;
  points: number;
}

function parseNumber(s: string): number {
  const n = Number(s.replace(/[,_\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

export default function Complexity({ onBack }: { onBack: () => void }) {
  const [urls, setUrls] = useState("");
  // Current Stellar Wave complexity values (Drips docs: points-and-rewards).
  const [points, setPoints] = useState<Record<ComplexityLevel, string>>({
    Trivial: "100",
    Medium: "150",
    High: "200",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<Assessment[] | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAssessments(null);

    const levelPoints = {} as Record<ComplexityLevel, number>;
    for (const level of LEVELS) {
      const n = parseNumber(points[level]);
      if (!Number.isFinite(n) || n <= 0) {
        setError(`Points for "${level}" must be a positive number.`);
        return;
      }
      levelPoints[level] = n;
    }

    const parsed = urls
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 10)
      .map((l) => ({ url: l, parsed: parseIssueUrl(l) }));

    if (parsed.length === 0) {
      setError("Paste at least one GitHub issue URL (one per line, up to 10).");
      return;
    }
    const bad = parsed.filter((p) => !p.parsed);
    if (bad.length > 0) {
      setError(
        `Couldn't parse: ${bad[0].url} — use https://github.com/owner/repo/issues/123`,
      );
      return;
    }

    setLoading(true);
    try {
      const settled = await Promise.allSettled(
        parsed.map(async (p) => {
          const parsedUrl = p.parsed!;
          const issue = await fetchIssue(
            parsedUrl.owner,
            parsedUrl.repo,
            parsedUrl.number,
          );
          const complexity = suggestComplexity(issue);
          return {
            issue,
            repo: `${parsedUrl.owner}/${parsedUrl.repo}`,
            complexity,
            points: levelPoints[complexity.level],
          } satisfies Assessment;
        }),
      );

      const results = settled
        .filter(
          (s): s is PromiseFulfilledResult<Assessment> => s.status === "fulfilled",
        )
        .map((s) => s.value);
      if (results.length === 0) {
        const rejected = settled.find(
          (s): s is PromiseRejectedResult => s.status === "rejected",
        );
        throw new Error(
          rejected && rejected.reason instanceof Error
            ? rejected.reason.message
            : "Couldn't fetch any of those issues — check the URLs and the rate limit.",
        );
      }
      setAssessments(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const summary = assessments
    ? summarizeAssessments(
        assessments.map((a) => ({
          level: a.complexity.level,
          points: a.points,
        })),
      )
    : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <button
        onClick={onBack}
        className="mb-6 text-sm text-slate-400 transition hover:text-white"
      >
        ← Back to home
      </button>

      <h1 className="text-3xl font-bold">Complexity Assistant</h1>
      <p className="mt-2 max-w-3xl text-slate-400">
        Paste the issues you're about to price. We read the title, body, labels,
        and discussion to suggest a Trivial / Medium / High rating — so your
        points budget is allocated fairly before issues go live.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <textarea
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          placeholder={
            "One GitHub issue URL per line (up to 10):\nhttps://github.com/stellar/go/issues/123\nhttps://github.com/stellar/js-stellar-base/issues/456"
          }
          required
          rows={4}
          className={`${inputCls} w-full resize-y`}
        />

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

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
        >
          {loading ? "Assessing…" : "Assess complexity"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      {assessments && (
        <div className="mt-10 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="font-semibold text-white">Assessments</h2>
            {summary && (
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                <Stat label="Issues assessed" value={String(assessments.length)} />
                {summary.counts.map(({ level, count }) => (
                  <div key={level} className="flex items-center gap-2">
                    <LevelChip level={level} />
                    <span className="font-semibold text-white">× {count}</span>
                  </div>
                ))}
                <Stat
                  label="Total points (as suggested)"
                  value={summary.totalPoints.toLocaleString()}
                  accent
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            {assessments.map((a) => (
              <div
                key={a.issue.html_url}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-500">{a.repo}</p>
                    <a
                      href={a.issue.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-white hover:underline"
                    >
                      #{a.issue.number} {a.issue.title}
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <LevelChip level={a.complexity.level} />
                    <span className="text-xs text-slate-500">
                      {Math.round(a.complexity.confidence * 100)}%
                    </span>
                    <span className="text-lg font-bold text-white">
                      {a.points.toLocaleString()} pts
                    </span>
                  </div>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-slate-400">
                  {a.complexity.signals.map((s) => (
                    <li key={s}>• {s}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500">
            Complexity comes from the same transparent v0 heuristic as the Match
            Score and Budget tools — it reads title, body, labels, and comment
            count, not an LLM call. Treat it as a second opinion, then adjust to
            your program's guidelines.
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