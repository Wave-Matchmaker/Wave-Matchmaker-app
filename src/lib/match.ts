import type { GithubIssue, GithubRepo, GithubUser } from "./github";

/**
 * Heuristic client-side "AI" match score (v0).
 *
 * Combines: language overlap, label/skill keyword overlap, bio/repo topical
 * signals, and issue size heuristics. This is a transparent deterministic
 * baseline — swap in an LLM call behind an API route later without changing
 * the UI contract.
 */

export interface ScoreBreakdown {
  total: number; // 0-100
  languageFit: number; // 0-40
  skillFit: number; // 0-35
  activityFit: number; // 0-15
  contextFit: number; // 0-10
  reasons: string[];
}

const LABEL_SKILL_MAP: Record<string, string[]> = {
  javascript: ["javascript", "js", "node"],
  typescript: ["typescript", "ts", "javascript"],
  python: ["python", "django", "flask", "pytest"],
  rust: ["rust", "cargo", "tokio"],
  go: ["go", "golang"],
  java: ["java", "spring", "jvm"],
  kotlin: ["kotlin", "jvm"],
  swift: ["swift", "ios", "cocoa"],
  ruby: ["ruby", "rails"],
  php: ["php", "laravel"],
  csharp: ["c#", "csharp", ".net", "dotnet"],
  cpp: ["c++", "cpp"],
  c: ["c", "embedded"],
  shell: ["shell", "bash", "scripting"],
  html: ["html", "css", "frontend"],
  css: ["css", "frontend", "design"],
  vue: ["vue", "frontend"],
  dart: ["dart", "flutter"],
  scala: ["scala", "jvm"],
  jupyter: ["python", "data", "notebooks"],
};

function norm(s: string): string {
  return s.toLowerCase();
}

/** Extract candidate skill tokens from the user's profile + repos. */
export function extractUserSkills(
  user: GithubUser,
  repos: GithubRepo[],
): Set<string> {
  const skills = new Set<string>();

  for (const r of repos) {
    if (r.language) skills.add(norm(r.language));
    for (const t of r.topics ?? []) skills.add(norm(t));
  }

  const bioText = [user.bio ?? "", user.company ?? ""].join(" ").toLowerCase();
  for (const [lang, aliases] of Object.entries(LABEL_SKILL_MAP)) {
    if (aliases.some((a) => bioText.includes(a))) skills.add(lang);
  }

  return skills;
}

/** Extract candidate skill tokens from the issue's labels + text. */
export function extractIssueSignals(issue: GithubIssue): Set<string> {
  const signals = new Set<string>();

  for (const l of issue.labels ?? []) signals.add(norm(l.name));

  const text = `${issue.title} ${issue.body ?? ""}`.slice(0, 4000).toLowerCase();
  for (const [lang, aliases] of Object.entries(LABEL_SKILL_MAP)) {
    if (aliases.some((a) => text.includes(a))) signals.add(lang);
  }

  return signals;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function computeMatchScore(
  user: GithubUser,
  repos: GithubRepo[],
  issue: GithubIssue,
  issueRepoLanguage: string | null,
): ScoreBreakdown {
  const reasons: string[] = [];
  const userSkills = extractUserSkills(user, repos);
  const issueSignals = extractIssueSignals(issue);

  // 1. Language fit (0-40): direct overlap between user languages and issue
  //    signals, weighted by the target repo's primary language.
  let languageFit = 0;
  const directOverlap = [...userSkills].filter((s) => issueSignals.has(s));
  if (directOverlap.length > 0) {
    languageFit = Math.min(30, 10 + directOverlap.length * 8);
    reasons.push(
      `Skill overlap: ${directOverlap.slice(0, 4).join(", ")} appear in both your repos and the issue.`,
    );
  }
  if (issueRepoLanguage && userSkills.has(norm(issueRepoLanguage))) {
    languageFit += 10;
    reasons.push(
      `You have repos in ${issueRepoLanguage}, the target repo's primary language.`,
    );
  } else if (issueRepoLanguage) {
    reasons.push(
      `No repos in ${issueRepoLanguage} (target repo's primary language) — consider a warm-up PR there first.`,
    );
  }
  languageFit = Math.min(40, languageFit);

  // 2. Skill/label fit (0-35): Jaccard overlap between user skill set and
  //    issue signal set.
  const skillFit = Math.round(Math.min(35, jaccard(userSkills, issueSignals) * 90));
  if (skillFit >= 15) {
    reasons.push("Strong topical overlap between your profile and this issue.");
  } else if (skillFit <= 5) {
    reasons.push("Limited topical overlap — this one may be outside your lane.");
  }

  // 3. Activity fit (0-15): recent push activity suggests you can move fast
  //    within a one-week Wave.
  let activityFit = 0;
  const now = Date.now();
  const recentPushes = repos.filter((r) => {
    const days = (now - new Date(r.pushed_at).getTime()) / 86_400_000;
    return days <= 30;
  }).length;
  activityFit = Math.min(15, recentPushes * 3);
  if (recentPushes >= 3) {
    reasons.push(`${recentPushes} repos pushed to in the last 30 days — good velocity.`);
  } else {
    reasons.push("Low recent push activity — Waves are one-week sprints.");
  }

  // 4. Context fit (0-10): account age (tenure) + small heuristics.
  const accountAgeYears =
    (now - new Date(user.created_at).getTime()) / (365.25 * 86_400_000);
  const contextFit = Math.round(Math.min(10, accountAgeYears * 3));
  if (accountAgeYears >= 2) {
    reasons.push(`GitHub account is ${Math.floor(accountAgeYears)}+ years old.`);
  }

  const total = Math.max(
    0,
    Math.min(100, languageFit + skillFit + activityFit + contextFit),
  );

  return { total, languageFit, skillFit, activityFit, contextFit, reasons };
}

export interface ComplexitySuggestion {
  level: "Trivial" | "Medium" | "High";
  confidence: number; // 0-1
  signals: string[];
}

/** Bonus heuristic for maintainers: suggest a complexity level for an issue. */
export function suggestComplexity(issue: GithubIssue): ComplexitySuggestion {
  const text = `${issue.title} ${issue.body ?? ""}`.toLowerCase();
  const signals: string[] = [];
  let score = 0;

  const labels = (issue.labels ?? []).map((l) => norm(l.name));
  const beginnerLabel = labels.some((l) => /good first issue|beginner|easy|starter/.test(l));
  const complexLabel = labels.some((l) => /hard|complex|heavy|architecture/.test(l));
  if (beginnerLabel) {
    score -= 2;
    signals.push("labeled beginner-friendly");
  }
  if (complexLabel) {
    score += 2;
    signals.push("labeled complex");
  }

  const bodyLen = (issue.body ?? "").length;
  const hasHeavyKeywords = /breaking|refactor|migrat|rewrite|architect/.test(text);
  const hasCosmeticKeywords = /typo|docs|readme|comment|rename|css|spelling/.test(text);

  // No labels, no body, and no keyword signals means there's nothing to scope by:
  // don't let the low comment count alone imply "trivial". Default to Medium.
  if (!beginnerLabel && !complexLabel && bodyLen === 0 && !hasHeavyKeywords && !hasCosmeticKeywords) {
    return {
      level: "Medium",
      confidence: 0.4,
      signals: ["No strong signals found — default to Medium."],
    };
  }

  if (issue.comments >= 15) {
    score += 1;
    signals.push(`${issue.comments} comments (likely contentious/multi-part)`);
  } else if (issue.comments <= 2) {
    score -= 1;
    signals.push("few comments (likely well-scoped)");
  }

  if (bodyLen > 2500) {
    score += 1;
    signals.push("long issue body");
  } else if (bodyLen > 0 && bodyLen < 400) {
    score -= 1;
    signals.push("short, focused issue body");
  }

  if (hasHeavyKeywords) {
    score += 1;
    signals.push("refactor/migration keywords");
  }
  if (hasCosmeticKeywords) {
    score -= 1;
    signals.push("docs/cosmetic keywords");
  }

  const level: ComplexitySuggestion["level"] =
    score <= -1 ? "Trivial" : score >= 2 ? "High" : "Medium";
  const confidence = Math.min(0.9, 0.4 + Math.abs(score) * 0.12);

  return { level, confidence, signals };
}
