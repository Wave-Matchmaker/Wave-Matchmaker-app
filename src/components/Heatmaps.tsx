import { Fragment, useMemo, useState } from "react";
import {
  fetchContributors,
  fetchOrgRepos,
  fetchRepoDetail,
} from "../lib/github";
import {
  buildContributorRows,
  topRepos,
  type ContributorRow,
  type RepoContributions,
} from "../lib/heatmaps";
import { inputCls } from "./ui";

interface HeatResult {
  rows: ContributorRow[];
  scanned: number;
  total: number;
}

function cellValue(row: ContributorRow, repo: string): number {
  return row.repos.find((r) => r.repo === repo)?.contributions ?? 0;
}

function shortRepo(repo: string): string {
  return repo.split("/")[1] ?? repo;
}

export default function Heatmaps({ onBack }: { onBack: () => void }) {
  const [scope, setScope] = useState<"org" | "repo">("org");
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HeatResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

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
      let repoList: { path: string; language: string | null }[];
      if (scope === "org") {
        const repos = await fetchOrgRepos(t, 10);
        repoList = repos
          .filter((r) => !r.fork)
          .map((r) => ({ path: r.full_name, language: r.language }));
      } else {
        const [owner, repo] = t.split("/");
        const detail = await fetchRepoDetail(owner, repo);
        repoList = [{ path: t, language: detail.language }];
      }

      if (repoList.length === 0) {
        setResult({ rows: [], scanned: 0, total: 0 });
        return;
      }

      const settled = await Promise.allSettled(
        repoList.map(async ({ path, language }) => {
          const [owner, repo] = path.split("/");
          const contributors = (await fetchContributors(owner, repo)).filter(
            (c) => c.login,
          );
          return { repo: path, language, contributors } satisfies RepoContributions;
        }),
      );

      const data = settled
        .filter(
          (s): s is PromiseFulfilledResult<RepoContributions> =>
            s.status === "fulfilled",
        )
        .map((s) => s.value);
      if (data.length === 0) {
        const rejected = settled.find(
          (s): s is PromiseRejectedResult => s.status === "rejected",
        );
        throw new Error(
          rejected && rejected.reason instanceof Error
            ? rejected.reason.message
            : "Couldn't fetch contributor data — check the org/repo name and the rate limit.",
        );
      }

      const rows = buildContributorRows(data);
      setResult({
        rows,
        scanned: data.length,
        total: rows.reduce((sum, r) => sum + r.total, 0),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(
        msg.includes("Not found")
          ? "Not found — check the org or repo name."
          : msg,
      );
    } finally {
      setLoading(false);
    }
  }

  const heat = useMemo(() => {
    if (!result || result.rows.length === 0) return null;
    const repos = topRepos(result.rows, 6);
    const contributors = result.rows.slice(0, 10);
    const maxCell = Math.max(
      1,
      ...contributors.flatMap((row) =>
        repos.map((repo) => cellValue(row, repo)),
      ),
    );
    return { repos, contributors, maxCell };
  }, [result]);

  const maxTotal = result?.rows[0]?.total ?? 1;

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <button
        onClick={onBack}
        className="mb-6 text-sm text-slate-400 transition hover:text-white"
      >
        ← Back to home
      </button>

      <h1 className="text-3xl font-bold">Contributor Heatmaps</h1>
      <p className="mt-2 max-w-3xl text-slate-400">
        Point it at your org or a single repo and see who's actually moving the
        needle — ranked by contributions across repos, with the languages each
        contributor is strongest in.
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

        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={scope === "org" ? "GitHub org (e.g. stellar)" : "owner/repo (e.g. stellar/go)"}
            required
            className={inputCls}
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {loading ? "Scanning…" : "Build heatmap"}
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-10 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="font-semibold text-white">Contributor heatmap</h2>
            <div className="mt-4 flex flex-wrap gap-6 text-sm">
              <Stat label="Contributors found" value={String(result.rows.length)} accent />
              <Stat label="Repos scanned" value={String(result.scanned)} />
              <Stat label="Total contributions" value={result.total.toLocaleString()} />
            </div>

            {heat ? (
              <div className="mt-6 overflow-x-auto">
                <div className="min-w-[560px]">
                  <div
                    className="grid gap-px"
                    style={{
                      gridTemplateColumns: `150px repeat(${heat.repos.length}, minmax(52px, 1fr))`,
                    }}
                  >
                    <div className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Contributor
                    </div>
                    {heat.repos.map((repo) => (
                      <div
                        key={repo}
                        title={repo}
                        className="truncate px-2 py-2 text-center text-xs text-slate-400"
                      >
                        {shortRepo(repo)}
                      </div>
                    ))}
                    {heat.contributors.map((row) => (
                      <Fragment key={row.contributor.login}>
                        <div
                          title={row.contributor.login}
                          className="truncate px-2 py-2 text-sm text-slate-300"
                        >
                          {row.contributor.login}
                        </div>
                        {heat.repos.map((repo) => {
                          const v = cellValue(row, repo);
                          return (
                            <div
                              key={repo}
                              className="flex items-center justify-center px-2 py-2 text-xs font-semibold text-white"
                              style={{
                                backgroundColor:
                                  v > 0
                                    ? `rgba(34, 211, 238, ${(0.15 + 0.75 * (v / heat.maxCell)).toFixed(3)})`
                                    : "rgba(15, 23, 42, 0.4)",
                              }}
                            >
                              {v > 0 ? v : ""}
                            </div>
                          );
                        })}
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                {scope === "org"
                  ? `No public contributors found for org "${target.trim()}" — repos may be private or have no commit activity tied to GitHub accounts.`
                  : `No contributors found in ${target.trim()} — the repo may be private or have no commit activity tied to GitHub accounts.`}
              </p>
            )}
          </div>

          {result.rows.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Contributor</th>
                    <th className="px-4 py-3 text-right">Contributions</th>
                    <th className="px-4 py-3 text-right">Repos</th>
                    <th className="px-4 py-3">Top languages</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                  {result.rows.slice(0, 20).map((row, i) => (
                    <tr key={row.contributor.login}>
                      <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                      <td className="px-4 py-3">
                        <a
                          href={row.contributor.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 font-medium text-white hover:underline"
                        >
                          <img
                            src={row.contributor.avatar_url}
                            alt=""
                            loading="lazy"
                            className="h-6 w-6 rounded-full"
                          />
                          {row.contributor.login}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className="inline-block rounded-md px-2 py-1 font-semibold text-white"
                          style={{
                            backgroundColor: `rgba(52, 211, 153, ${(0.12 + 0.6 * (row.total / maxTotal)).toFixed(3)})`,
                          }}
                        >
                          {row.total.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        {row.repos.length}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {[...row.languages]
                            .sort((a, b) => b.weight - a.weight)
                            .slice(0, 3)
                            .map((l) => (
                              <span
                                key={l.language}
                                title={`${l.weight.toLocaleString()} contributions`}
                                className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300"
                              >
                                {l.language}
                              </span>
                            ))}
                          {row.languages.length === 0 && (
                            <span className="text-xs text-slate-500">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-slate-500">
            {scope === "org" &&
              "Scans up to the 10 most recently-pushed public repos in the org (forks excluded). "}
            Contribution counts come from the GitHub contributors API (commits to
            the default branch tied to GitHub accounts — a rough activity proxy).
            Skills are inferred from the primary language of the repos each
            contributor commits to, weighted by contribution count.
            Unauthenticated core API limits (~60 req/hr) apply.
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