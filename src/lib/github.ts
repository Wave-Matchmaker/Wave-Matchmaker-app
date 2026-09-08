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
  const res = await fetch(`${API}${path}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
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

export async function fetchRepoDetail(
  owner: string,
  repo: string,
): Promise<GithubRepoDetail> {
  const r = await get<{ language: string | null; topics?: string[]; description: string | null }>(
    `/repos/${owner}/${repo}`,
  );
  return { language: r.language, topics: r.topics ?? [], description: r.description };
}
