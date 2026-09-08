import { describe, expect, it } from "vitest";
import type { GithubIssue, GithubRepo, GithubUser } from "./github";
import {
  computeMatchScore,
  extractIssueSignals,
  extractUserSkills,
  suggestComplexity,
} from "./match";

const DAY = 86_400_000;

function makeUser(overrides: Partial<GithubUser> = {}): GithubUser {
  return {
    login: "dev",
    name: null,
    bio: null,
    company: null,
    public_repos: 10,
    followers: 3,
    created_at: new Date(Date.now() - 5 * 365.25 * DAY).toISOString(),
    ...overrides,
  };
}

function makeRepo(
  overrides: Partial<GithubRepo> & { pushedDaysAgo?: number } = {},
): GithubRepo {
  const { pushedDaysAgo = 300, ...rest } = overrides;
  return {
    name: "repo",
    full_name: "dev/repo",
    language: null,
    description: null,
    topics: [],
    stargazers_count: 0,
    fork: false,
    pushed_at: new Date(Date.now() - pushedDaysAgo * DAY).toISOString(),
    ...rest,
  };
}

function makeIssue(overrides: Partial<GithubIssue> = {}): GithubIssue {
  return {
    number: 1,
    title: "Work needed",
    body: null,
    labels: [],
    state: "open",
    comments: 0,
    html_url: "https://github.com/o/r/issues/1",
    ...overrides,
  };
}

describe("extractUserSkills", () => {
  it("collects repo languages and topics", () => {
    const repos = [
      makeRepo({ name: "a", language: "Python", topics: ["django", "api"] }),
      makeRepo({ name: "b", language: "Rust", topics: [] }),
    ];
    const skills = extractUserSkills(makeUser(), repos);
    expect(skills.has("python")).toBe(true);
    expect(skills.has("django")).toBe(true);
    expect(skills.has("api")).toBe(true);
    expect(skills.has("rust")).toBe(true);
  });

  it("infers skills from bio keywords", () => {
    const user = makeUser({ bio: "Flask lover", company: "Acme" });
    const skills = extractUserSkills(user, []);
    expect(skills.has("python")).toBe(true);
  });

  it("returns no skills for an empty profile", () => {
    expect(extractUserSkills(makeUser(), []).size).toBe(0);
  });
});

describe("extractIssueSignals", () => {
  it("normalizes labels and scans the body for language aliases", () => {
    const issue = makeIssue({
      labels: [{ name: "BUG" }],
      body: "Broken django queryset; flask involved.",
    });
    const signals = extractIssueSignals(issue);
    expect(signals.has("bug")).toBe(true);
    expect(signals.has("python")).toBe(true); // via django + flask aliases
  });

  it("returns nothing for an empty issue", () => {
    expect(extractIssueSignals(makeIssue()).size).toBe(0);
  });
});

describe("computeMatchScore", () => {
  it("scores a strong language + skill fit highly with explanations", () => {
    const user = makeUser(); // ~5 year-old account
    const repos = [
      makeRepo({ name: "ts-a", language: "TypeScript", pushedDaysAgo: 2 }),
      makeRepo({ name: "ts-b", language: "TypeScript", pushedDaysAgo: 5 }),
      makeRepo({ name: "ts-c", language: "TypeScript", pushedDaysAgo: 8 }),
    ];
    const issue = makeIssue({
      title: "Typescript work item",
      body: "Help wanted in the typescript sdk.",
      labels: [{ name: "TypeScript" }],
    });

    const score = computeMatchScore(user, repos, issue, "typescript");
    expect(score.languageFit).toBe(28); // 18 overlap + 10 primary language
    expect(score.skillFit).toBe(35);
    expect(score.activityFit).toBe(9); // 3 repos pushed recently
    expect(score.contextFit).toBe(10);
    expect(score.total).toBe(82);
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
    expect(score.reasons.some((r) => r.includes("Skill overlap"))).toBe(true);
    expect(score.reasons.some((r) => r.includes("primary language"))).toBe(true);
  });

  it("scores a mismatch low and says why", () => {
    const repos = [makeRepo({ name: "rust-only", language: "Rust", pushedDaysAgo: 200 })];
    const issue = makeIssue({
      title: "Add python bindings",
      body: "Python is the target here.",
      labels: [{ name: "python" }],
    });
    const score = computeMatchScore(makeUser(), repos, issue, "python");
    expect(score.languageFit).toBe(0);
    expect(score.skillFit).toBe(0);
    expect(score.total).toBeLessThan(30);
    expect(score.reasons.some((r) => r.includes("No repos in python"))).toBe(true);
    expect(score.reasons.some((r) => r.includes("Limited topical overlap"))).toBe(true);
  });

  it("handles a missing repo language without crashing", () => {
    const repos = [makeRepo({ language: "Go", pushedDaysAgo: 1 })];
    const issue = makeIssue({ labels: [{ name: "go" }] });
    const score = computeMatchScore(makeUser(), repos, issue, null);
    expect(Number.isFinite(score.total)).toBe(true);
  });

  it("clamps every component and the total at their caps", () => {
    const langs = ["typescript", "python", "rust", "go", "java", "swift"];
    const repos = langs.map((lang, i) =>
      makeRepo({ name: `repo-${lang}`, language: lang, pushedDaysAgo: i + 1 }),
    );
    const issue = makeIssue({
      labels: langs.map((l) => ({ name: l })),
    });
    const score = computeMatchScore(
      makeUser({ created_at: new Date(Date.now() - 20 * 365.25 * DAY).toISOString() }),
      repos,
      issue,
      "typescript",
    );
    expect(score.languageFit).toBe(40);
    expect(score.skillFit).toBe(35);
    expect(score.activityFit).toBe(15);
    expect(score.contextFit).toBe(10);
    expect(score.total).toBe(100);
  });

  it("is deterministic for identical inputs", () => {
    const repos = [makeRepo({ language: "Go", pushedDaysAgo: 3 })];
    const issue = makeIssue({ labels: [{ name: "go" }], comments: 4 });
    const a = computeMatchScore(makeUser(), repos, issue, "go");
    const b = computeMatchScore(makeUser(), repos, issue, "go");
    expect(a).toEqual(b);
  });
});

describe("suggestComplexity", () => {
  it("labels a beginner-friendly typo issue as Trivial", () => {
    const res = suggestComplexity(
      makeIssue({
        title: 'Fix spelling of "recieve" in README',
        body: "Typo only, one-line change.",
        labels: [{ name: "good first issue" }],
        comments: 0,
      }),
    );
    expect(res.level).toBe("Trivial");
    expect(res.confidence).toBeGreaterThan(0.4);
    expect(res.signals.length).toBeGreaterThan(0);
  });

  it("labels a heavy refactor with lots of discussion as High", () => {
    const longBody = Array.from({ length: 60 }, (_, i) => `Requirement ${i} for the migration.`).join("\n");
    const res = suggestComplexity(
      makeIssue({
        title: "Refactor the core architecture",
        body: longBody,
        labels: [{ name: "hard" }],
        comments: 20,
      }),
    );
    expect(res.level).toBe("High");
  });

  it("defaults an empty issue to Medium", () => {
    const res = suggestComplexity(makeIssue());
    expect(res.level).toBe("Medium");
  });

  it("only ever returns valid levels with sane confidence", () => {
    for (const issue of [
      makeIssue({ title: "Add feature", body: "More than a typo but small." }),
      makeIssue({ title: "Docs update", body: "Rewrite the readme.", labels: [{ name: "easy" }] }),
      makeIssue({ title: "Breaking change", body: "Migrate everything.", comments: 30 }),
    ]) {
      const res = suggestComplexity(issue);
      expect(["Trivial", "Medium", "High"]).toContain(res.level);
      expect(res.confidence).toBeGreaterThanOrEqual(0);
      expect(res.confidence).toBeLessThanOrEqual(1);
    }
  });
});
