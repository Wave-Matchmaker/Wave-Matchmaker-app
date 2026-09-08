import { useState } from "react";
import {
  fetchIssue,
  fetchRepoDetail,
  fetchRepos,
  fetchUser,
  parseIssueUrl,
  type GithubIssue,
  type GithubRepo,
  type GithubUser,
} from "../lib/github";
import {
  computeMatchScore,
  extractUserSkills,
  suggestComplexity,
  type ScoreBreakdown,
} from "../lib/match";
import { inputCls, ScoreRing } from "./ui";

interface Result {
  user: GithubUser;
  repos: GithubRepo[];
  issue: GithubIssue;
  repoLanguage: string | null;
  score: ScoreBreakdown;
  complexity: ReturnType<typeof suggestComplexity>;
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>
          {value}/{max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function MatchScore({ onBack }: { onBack: () => void }) {
  const [username, setUsername] = useState("");
  const [issueUrl, setIssueUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const parsed = parseIssueUrl(issueUrl);
    if (!parsed) {
      setError("Issue URL must look like https://github.com/owner/repo/issues/123");
      return;
    }

    setLoading(true);
    try {
      const user = await fetchUser(username.trim());
      const repos = await fetchRepos(username.trim());
      const issue = await fetchIssue(parsed.owner, parsed.repo, parsed.number);
      const repoDetail = await fetchRepoDetail(parsed.owner, parsed.repo);
      const score = computeMatchScore(user, repos, issue, repoDetail.language);
      const complexity = suggestComplexity(issue);
      setResult({ user, repos, issue, repoLanguage: repoDetail.language, score, complexity });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <button
        onClick={onBack}
        className="mb-6 text-sm text-slate-400 transition hover:text-white"
      >
        ← Back to home
      </button>

      <h1 className="text-3xl font-bold">AI Match Score</h1>
      <p className="mt-2 text-slate-400">
        Enter a GitHub username and an issue URL. We fetch public data and score
        the fit with a transparent heuristic model (v0 — no login needed).
      </p>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="GitHub username (e.g. torvalds)"
          required
          className={inputCls}
        />
        <input
          value={issueUrl}
          onChange={(e) => setIssueUrl(e.target.value)}
          placeholder="https://github.com/owner/repo/issues/123"
          required
          className={inputCls}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
        >
          {loading ? "Scoring…" : "Score match"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-10 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <ScoreRing score={result.score.total} />
              <div className="text-right text-sm text-slate-400">
                <p>
                  <span className="text-white">{result.user.login}</span> →{" "}
                  <a
                    href={result.issue.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline"
                  >
                    #{result.issue.number} {result.issue.title}
                  </a>
                </p>
                <p className="mt-1">
                  {result.user.public_repos} public repos · {result.repos.length} recent (forks excluded)
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Bar label="Language fit" value={result.score.languageFit} max={40} />
              <Bar label="Skill/label overlap" value={result.score.skillFit} max={35} />
              <Bar label="Recent activity" value={result.score.activityFit} max={15} />
              <Bar label="Account context" value={result.score.contextFit} max={10} />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="font-semibold text-white">Why this score</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {result.score.reasons.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="font-semibold text-white">Maintainer view</h3>
              <p className="mt-3 text-sm text-slate-400">
                Suggested complexity for this issue:
              </p>
              <p className="mt-2 text-2xl font-bold text-cyan-300">
                {result.complexity.level}{" "}
                <span className="text-sm font-normal text-slate-400">
                  ({Math.round(result.complexity.confidence * 100)}% confidence)
                </span>
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {result.complexity.signals.length === 0 ? (
                  <li>• No strong signals found — default to Medium.</li>
                ) : (
                  result.complexity.signals.map((s) => <li key={s}>• {s}</li>)
                )}
              </ul>
              <p className="mt-4 text-xs text-slate-500">
                Your skills detected: {[...extractUserSkills(result.user, result.repos)].slice(0, 8).join(", ") || "none"}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
