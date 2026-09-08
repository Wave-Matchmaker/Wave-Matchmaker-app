import { useMemo, useState } from "react";
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
import { computeMatchScore, type ScoreBreakdown } from "../lib/match";
import { inputCls, ScoreRing } from "./ui";

interface Candidate {
  issue: GithubIssue;
  repo: string; // owner/repo
  owner: string;
  score: ScoreBreakdown;
  advice?: string; // set when the issue is NOT a pick
}

interface CoachResult {
  user: GithubUser;
  repos: GithubRepo[];
  slots: number;
  orgCap: number; // 0 = no per-owner cap
  candidates: Candidate[];
}

/** Greedy pick: best-scoring issues first, respecting remaining slots & per-owner cap. */
function buildPlan(candidates: Candidate[], slots: number, orgCap: number) {
  const sorted = [...candidates].sort((a, b) => b.score.total - a.score.total);
  const picks: Candidate[] = [];
  const ownerCount = new Map<string, number>();
  let slotsLeft = slots;

  for (const c of sorted) {
    if (slotsLeft <= 0) {
      c.advice = "No slots left — ranked below your picks.";
      continue;
    }
    const used = ownerCount.get(c.owner) ?? 0;
    if (orgCap > 0 && used >= orgCap) {
      c.advice = `Per-org cap (${orgCap}) reached for ${c.owner}.`;
      continue;
    }
    picks.push(c);
    ownerCount.set(c.owner, used + 1);
    slotsLeft--;
  }
  return { sorted, picks, slotsLeft };
}

export default function Coach({ onBack }: { onBack: () => void }) {
  const [username, setUsername] = useState("");
  const [slotsInput, setSlotsInput] = useState("3");
  // Wave caps at 4 assignments per org per Wave (Drips docs); use as the default.
  const [orgCapInput, setOrgCapInput] = useState("4");
  const [urls, setUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CoachResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const slots = Number(slotsInput);
    if (!Number.isInteger(slots) || slots < 1 || slots > 10) {
      setError("Remaining application slots must be a whole number between 1 and 10.");
      return;
    }
    const orgCap = orgCapInput.trim() === "" ? 0 : Number(orgCapInput);
    if (!Number.isInteger(orgCap) || orgCap < 1) {
      setError("Max applications per org must be blank or a whole number ≥ 1.");
      return;
    }

    const parsed = urls
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 5)
      .map((l) => ({ url: l, parsed: parseIssueUrl(l) }));

    if (parsed.length === 0) {
      setError("Paste at least one GitHub issue URL (one per line, up to 5).");
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
      const [user, repos] = await Promise.all([
        fetchUser(username.trim()),
        fetchRepos(username.trim()),
      ]);

      const uniqueRepos = [
        ...new Set(parsed.map((p) => `${p.parsed!.owner}/${p.parsed!.repo}`)),
      ];
      const langs = await Promise.all(
        uniqueRepos.map(async (path) => {
          const [owner, repo] = path.split("/");
          const detail = await fetchRepoDetail(owner, repo);
          return [path, detail.language] as const;
        }),
      );
      const langMap = new Map(langs);

      const settled = await Promise.allSettled(
        parsed.map(async (p) => {
          const parsedUrl = p.parsed!;
          const issue = await fetchIssue(parsedUrl.owner, parsedUrl.repo, parsedUrl.number);
          const score = computeMatchScore(
            user,
            repos,
            issue,
            langMap.get(`${parsedUrl.owner}/${parsedUrl.repo}`) ?? null,
          );
          return {
            issue,
            repo: `${parsedUrl.owner}/${parsedUrl.repo}`,
            owner: parsedUrl.owner,
            score,
          } satisfies Candidate;
        }),
      );

      const candidates = settled
        .filter((s): s is PromiseFulfilledResult<Candidate> => s.status === "fulfilled")
        .map((s) => s.value);
      if (candidates.length === 0) {
        const rejected = settled.find(
          (s): s is PromiseRejectedResult => s.status === "rejected",
        );
        throw new Error(
          rejected && rejected.reason instanceof Error
            ? rejected.reason.message
            : "Couldn't fetch any of those issues — check the URLs and the rate limit.",
        );
      }

      setResult({ user, repos, slots, orgCap, candidates });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const plan = useMemo(
    () => (result ? buildPlan(result.candidates, result.slots, result.orgCap) : null),
    [result],
  );

  const tips = useMemo(() => {
    if (!plan || plan.picks.length === 0) return [];
    const t: string[] = [];
    const best = plan.picks[0].score.total;
    if (best < 45) {
      t.push(
        "Your best match scores below 45 — consider not spending slots yet, or warming up in the target repo first.",
      );
    } else if (best < 60) {
      t.push("Top pick is decent but not overwhelming — apply, but keep expectations calibrated.");
    }
    if (plan.slotsLeft > 0) {
      t.push(
        `You'd still have ${plan.slotsLeft} slot${plan.slotsLeft === 1 ? "" : "s"} left — only spend them on issues that score well.`,
      );
    }
    const owners = new Set(plan.picks.map((c) => c.owner));
    if (owners.size < plan.picks.length) {
      t.push(
        "Your picks span fewer orgs than issues — double-check per-org assignment caps before applying.",
      );
    }
    return t;
  }, [plan]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <button onClick={onBack} className="mb-6 text-sm text-slate-400 transition hover:text-white">
        ← Back to home
      </button>

      <h1 className="text-3xl font-bold">Strategy Coach</h1>
      <p className="mt-2 max-w-3xl text-slate-400">
        Enter your GitHub username and the issues you're weighing. We score each one and
        recommend where to spend your remaining application slots — respecting a per-org
        cap if you set one.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="GitHub username (e.g. torvalds)"
            required
            className={inputCls}
          />
          <input
            type="number"
            min={1}
            max={10}
            value={slotsInput}
            onChange={(e) => setSlotsInput(e.target.value)}
            placeholder="Apps left this Wave"
            className={inputCls}
          />
          <input
            type="number"
            min={0}
            value={orgCapInput}
            onChange={(e) => setOrgCapInput(e.target.value)}
            placeholder="Max picks per org (blank = none)"
            className={inputCls}
          />
        </div>
        <textarea
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          placeholder={"One GitHub issue URL per line (up to 5):\nhttps://github.com/stellar/go/issues/123\nhttps://github.com/stellar/js-stellar-base/issues/456"}
          required
          rows={3}
          className={`${inputCls} w-full resize-y`}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
        >
          {loading ? "Scoring…" : "Build my plan"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      {result && plan && (
        <div className="mt-10 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <ScoreRing score={plan.picks[0]?.score.total ?? 0} />
              <div className="text-right text-sm text-slate-400">
                <p>
                  <span className="text-white">@{result.user.login}</span> · {result.slots}{" "}
                  app slot{result.slots === 1 ? "" : "s"} left
                  {result.orgCap > 0 ? ` · max ${result.orgCap} per org` : ""}
                </p>
                <p className="mt-1">{result.candidates.length} issues scored</p>
              </div>
            </div>

            {tips.length > 0 && (
              <ul className="mt-4 space-y-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-sm text-cyan-100/90">
                {tips.map((tip) => (
                  <li key={tip}>💡 {tip}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            {plan.sorted.map((c, i) => {
              const picked = plan.picks.includes(c);
              return (
                <div
                  key={`${c.repo}#${c.issue.number}`}
                  className={`rounded-2xl border p-5 ${
                    picked
                      ? "border-cyan-500/40 bg-slate-900"
                      : "border-slate-800 bg-slate-900/50 opacity-80"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs font-bold text-slate-300">
                          #{i + 1}
                        </span>
                        <span>{c.owner}</span>
                        <a
                          href={c.issue.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate font-semibold text-white hover:underline"
                        >
                          {c.issue.title}
                        </a>
                      </p>
                      <p className="mt-2 text-sm text-slate-400">
                        {c.score.reasons.slice(0, 2).join(" · ") || "No strong signals — treat as a guess."}
                      </p>
                      {c.advice && (
                        <p className="mt-2 text-sm italic text-amber-300/90">— {c.advice}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {picked && (
                        <span className="rounded-full bg-cyan-500/15 px-2.5 py-1 text-xs font-bold text-cyan-300 ring-1 ring-cyan-500/40">
                          ✓ Pick
                        </span>
                      )}
                      <span
                        className={`text-2xl font-extrabold ${
                          c.score.total >= 70
                            ? "text-emerald-400"
                            : c.score.total >= 45
                              ? "text-amber-400"
                              : "text-rose-400"
                        }`}
                      >
                        {c.score.total}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
