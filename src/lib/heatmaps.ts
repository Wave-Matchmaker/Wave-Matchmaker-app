import type { GithubContributor } from "./github";

/**
 * Contributor heatmap aggregation (v0).
 *
 * Takes per-repo contributor lists and rolls them up into per-contributor
 * totals, plus a contribution-weighted language profile (the primary language
 * of each repo they commit to, weighted by how much they commit there).
 */

export interface RepoContributions {
  repo: string; // owner/repo
  language: string | null;
  contributors: GithubContributor[];
}

export interface ContributorRow {
  contributor: Pick<GithubContributor, "login" | "avatar_url" | "html_url">;
  total: number; // contributions across all scanned repos
  repos: { repo: string; contributions: number; language: string | null }[];
  languages: { language: string; weight: number }[];
}

export function buildContributorRows(
  repos: RepoContributions[],
): ContributorRow[] {
  const byLogin = new Map<string, ContributorRow>();

  for (const r of repos) {
    for (const c of r.contributors) {
      let row = byLogin.get(c.login);
      if (!row) {
        row = {
          contributor: {
            login: c.login,
            avatar_url: c.avatar_url,
            html_url: c.html_url,
          },
          total: 0,
          repos: [],
          languages: [],
        };
        byLogin.set(c.login, row);
      }
      row.total += c.contributions;
      row.repos.push({
        repo: r.repo,
        contributions: c.contributions,
        language: r.language,
      });
      if (r.language) {
        const lang = row.languages.find((l) => l.language === r.language);
        if (lang) lang.weight += c.contributions;
        else row.languages.push({ language: r.language, weight: c.contributions });
      }
    }
  }

  return [...byLogin.values()].sort((a, b) => b.total - a.total);
}

/** Repos ranked by total contributor activity, capped at `max`. */
export function topRepos(rows: ContributorRow[], max: number): string[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    for (const entry of row.repos) {
      totals.set(entry.repo, (totals.get(entry.repo) ?? 0) + entry.contributions);
    }
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([repo]) => repo);
}