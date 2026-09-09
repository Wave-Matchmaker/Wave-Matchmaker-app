/** Minimal GitHub REST API client (unauthenticated, public data only). */

const API = "https://api.github.com";

export interface GithubUser {
  login: string;
  name: string | null;
  bio: string | null;
  company: string | null;
  public_repos: number;
  followers: number;
  created_at: string;
}

export interface GithubRepo {
  name: string;
  full_name: string;
  language: string | null;
  description: string | null;
  topics: string[];
  stargazers_count: number;
  fork: boolean;
  pushed_at: string;
}

export interface GithubIssue {
  number: number;
  title: string;
  body: string | null;
  labels: { name: string }[];
  state: string;
  comments: number;
  html_url: string;
  repository_url?: string;
}

export interface GithubRepoDetail {
  language: string | null;
  topics: string[];
  description: string | null;
}

class GithubError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function get<T>(path: string): Promise<T> {
  return (await getMaybe<T>(path)) as T;
}

/** Like get, but returns null on 204 No Content instead of failing to parse. */
async function getMaybe<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API}${path}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    if (res.status === 403 || res.status === 429) {
      throw new GithubError(
        "GitHub API rate limit reached (60 req/hr unauthenticated). Wait a bit or paste data manually.",
        res.status,
      );
    }
    if (res.status === 404) {
      throw new GithubError("Not found — check the username or issue URL.", 404);
    }
    throw new GithubError(`GitHub API error (${res.status})`, res.status);
  }
  return (await res.json()) as T;
}

export async function fetchUser(username: string): Promise<GithubUser> {
  return get<GithubUser>(`/users/${encodeURIComponent(username)}`);
}

export async function fetchRepos(
  username: string,
  max = 30,
): Promise<GithubRepo[]> {
  const repos = await get<GithubRepo[]>(
    `/users/${encodeURIComponent(username)}/repos?sort=pushed&per_page=${max}`,
  );
  return repos.filter((r) => !r.fork);
}

/** Parse "https://github.com/{owner}/{repo}/issues/{n}" or ".../pull/{n}". */
export function parseIssueUrl(url: string): {
  owner: string;
  repo: string;
  number: number;
} | null {
  const m = url.trim().match(
    /^https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/(?:issues|pull)\/(\d+)/i,
  );
  if (!m) return null;
  return { owner: m[1], repo: m[2], number: Number(m[3]) };
}

export async function fetchIssue(
  owner: string,
  repo: string,
  number: number,
): Promise<GithubIssue> {
  return get<GithubIssue>(
    `/repos/${owner}/${repo}/issues/${number}`,
  );
}

export interface GithubContributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

/** Most recently-pushed public repos for an org (forks not filtered here). */
export async function fetchOrgRepos(org: string, max = 10): Promise<GithubRepo[]> {
  return get<GithubRepo[]>(
    `/orgs/${encodeURIComponent(org)}/repos?sort=pushed&per_page=${max}`,
  );
}

/** Top contributors of a repo (commits to the default branch). Empty on 204. */
export async function fetchContributors(
  owner: string,
  repo: string,
  max = 10,
): Promise<GithubContributor[]> {
  const data = await getMaybe<GithubContributor[]>(
    `/repos/${owner}/${repo}/contributors?per_page=${max}`,
  );
  return data ?? [];
}

export async function fetchRepoDetail(
  owner: string,
  repo: string,
): Promise<GithubRepoDetail> {
  const r = await get<{ language: string | null; topics?: string[]; description: string | null }>(
    `/repos/${owner}/${repo}`,
  );
  return { language: r.language, topics: r.topics ?? [], description: r.description };
}

export interface GithubIssueSearchItem extends GithubIssue {
  reactions: { total_count: number };
  closed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  pull_request?: { merged_at?: string | null };
}

interface SearchIssuesResponse {
  total_count: number;
  items: GithubIssueSearchItem[];
}

/**
 * Search a repo or org's open issues via the GitHub search API (separate,
 * more generous rate limit bucket from the core REST API).
 */
export async function searchOpenIssues(
  scope: "org" | "repo",
  value: string,
  perPage = 100,
): Promise<{ total: number; items: GithubIssueSearchItem[] }> {
  const qualifier =
    scope === "org"
      ? `org:${value}`
      : `repo:${value}`;
  const q = `${qualifier} is:issue is:open`;
  const res = await get<SearchIssuesResponse>(
    `/search/issues?q=${encodeURIComponent(q)}&sort=updated&order=desc&per_page=${perPage}`,
  );
  return { total: res.total_count, items: res.items };
}

/**
 * Search a user's merged PRs merged between two dates (search API bucket,
 * separate from the core REST limit).
 */
export async function searchMergedPrs(
  username: string,
  since: string, // YYYY-MM-DD
  until: string, // YYYY-MM-DD
  perPage = 100,
): Promise<{ total: number; items: GithubIssueSearchItem[] }> {
  const q = `author:${username} is:pr is:merged merged:${since}..${until}`;
  const res = await get<SearchIssuesResponse>(
    `/search/issues?q=${encodeURIComponent(q)}&sort=updated&order=desc&per_page=${perPage}`,
  );
  return { total: res.total_count, items: res.items };
}

/** Derive "owner/repo" from an issue's repository_url or html_url. */
export function repoFromUrl(url: string): string | null {
  const m = url.match(/repos\/([\w.-]+\/[\w.-]+)(?:\/|$)/);
  if (m) return m[1];
  const h = url.match(/^https?:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/issues\//i);
  return h ? h[1] : null;
}
