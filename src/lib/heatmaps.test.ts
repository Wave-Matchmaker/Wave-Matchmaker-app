import { describe, expect, it } from "vitest";
import type { GithubContributor } from "./github";
import {
  buildContributorRows,
  topRepos,
  type RepoContributions,
} from "./heatmaps";

function contributor(login: string, contributions: number): GithubContributor {
  return {
    login,
    avatar_url: "",
    html_url: `https://github.com/${login}`,
    contributions,
  };
}

function repo(
  path: string,
  language: string | null,
  contributors: GithubContributor[],
): RepoContributions {
  return { repo: path, language, contributors };
}

describe("buildContributorRows", () => {
  it("aggregates a contributor's work across repos and sorts by total desc", () => {
    const rows = buildContributorRows([
      repo("o/api", "Go", [contributor("alice", 30), contributor("bob", 10)]),
      repo("o/web", "TypeScript", [contributor("bob", 25)]),
    ]);
    expect(rows.map((r) => r.contributor.login)).toEqual(["bob", "alice"]);
    expect(rows[0].total).toBe(35);
    expect(rows[0].repos).toHaveLength(2);
    expect(rows[1].total).toBe(30);
  });

  it("accumulates contribution-weighted language weights", () => {
    const rows = buildContributorRows([
      repo("o/api", "Go", [contributor("alice", 10)]),
      repo("o/sdk", "Go", [contributor("alice", 5)]),
      repo("o/web", "TypeScript", [contributor("alice", 2)]),
    ]);
    const [alice] = rows;
    expect(alice.languages).toEqual([
      { language: "Go", weight: 15 },
      { language: "TypeScript", weight: 2 },
    ]);
  });

  it("keeps repos with no language without breaking weights", () => {
    const rows = buildContributorRows([
      repo("o/x", null, [contributor("alice", 7)]),
    ]);
    expect(rows[0].total).toBe(7);
    expect(rows[0].languages).toEqual([]);
  });

  it("returns an empty list for empty input", () => {
    expect(buildContributorRows([])).toEqual([]);
  });
});

describe("topRepos", () => {
  it("ranks repos by total contributions and caps the list", () => {
    const rows = buildContributorRows([
      repo("o/a", "Go", [contributor("alice", 10)]),
      repo("o/b", "Rust", [contributor("alice", 30), contributor("bob", 5)]),
      repo("o/c", "Python", [contributor("bob", 8)]),
    ]);
    expect(topRepos(rows, 2)).toEqual(["o/b", "o/a"]);
  });

  it("breaks ties deterministically by repo name", () => {
    const rows = buildContributorRows([
      repo("o/z", "Go", [contributor("alice", 5)]),
      repo("o/a", "Go", [contributor("alice", 5)]),
    ]);
    expect(topRepos(rows, 2)).toEqual(["o/a", "o/z"]);
  });

  it("returns an empty list for empty rows", () => {
    expect(topRepos([], 5)).toEqual([]);
  });
});