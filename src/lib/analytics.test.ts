import { describe, expect, it } from "vitest";
import {
  buildTimeline,
  prsToCsv,
  previousWindow,
  summarizePrs,
  type PrEstimate,
} from "./analytics";
import type { ComplexityLevel } from "./complexity";

function pr(
  mergedAt: string,
  points = 100,
  level: ComplexityLevel = "Trivial",
  repo = "o/r",
): PrEstimate {
  return {
    repo,
    number: 1,
    title: "t",
    html_url: "https://github.com/o/r/pull/1",
    level,
    points,
    mergedAt,
  };
}

describe("buildTimeline", () => {
  it("buckets points by day and fills empty days", () => {
    const tl = buildTimeline(
      [
        pr("2026-08-24T10:00:00Z", 100),
        pr("2026-08-24T18:00:00Z", 150, "Medium"),
        pr("2026-08-26T09:00:00Z", 200, "High"),
      ],
      "2026-08-24",
      "2026-08-27",
    );
    expect(tl).toEqual([
      { date: "2026-08-24", points: 250, count: 2 },
      { date: "2026-08-25", points: 0, count: 0 },
      { date: "2026-08-26", points: 200, count: 1 },
      { date: "2026-08-27", points: 0, count: 0 },
    ]);
  });

  it("ignores PRs merged outside the window", () => {
    const tl = buildTimeline(
      [pr("2026-08-23T23:59:00Z", 100), pr("2026-08-24T00:00:00Z", 100)],
      "2026-08-24",
      "2026-08-24",
    );
    expect(tl).toEqual([{ date: "2026-08-24", points: 100, count: 1 }]);
  });

  it("switches to Monday-start weekly buckets for windows over 60 days", () => {
    const tl = buildTimeline(
      [pr("2026-07-06T10:00:00Z", 100)], // a Monday
      "2026-07-01",
      "2026-09-01",
    );
    expect(tl.length).toBeGreaterThan(0);
    expect(tl.length).toBeLessThanOrEqual(10);
    expect(tl.find((b) => b.date === "2026-07-06")?.points).toBe(100);
  });

  it("returns [] for an invalid window", () => {
    expect(buildTimeline([pr("2026-08-24", 100)], "2026-08-30", "2026-08-24")).toEqual([]);
    expect(buildTimeline([], "not-a-date", "2026-08-24")).toEqual([]);
  });
});

describe("previousWindow", () => {
  it("shifts an 8-day window back by exactly one period", () => {
    expect(previousWindow("2026-08-24", "2026-08-31")).toEqual({
      start: "2026-08-16",
      end: "2026-08-23",
    });
  });

  it("handles a one-day window", () => {
    expect(previousWindow("2026-08-24", "2026-08-24")).toEqual({
      start: "2026-08-23",
      end: "2026-08-23",
    });
  });

  it("returns null for an invalid window", () => {
    expect(previousWindow("2026-08-30", "2026-08-24")).toBeNull();
  });
});

describe("prsToCsv", () => {
  it("writes a header and one row per PR", () => {
    const csv = prsToCsv([pr("2026-08-24T10:00:00Z", 100, "Trivial", "o/r")]);
    expect(csv).toBe(
      'repo,number,title,level,points,merged_at\no/r,1,"t",Trivial,100,2026-08-24T10:00:00Z',
    );
  });

  it("quotes titles containing commas or quotes", () => {
    const p = pr("2026-08-24", 150, "Medium", "o/r");
    p.title = 'Fix "weird", bug';
    const csv = prsToCsv([p]);
    expect(csv).toContain('"Fix ""weird"", bug"');
  });

  it("returns just the header for an empty list", () => {
    expect(prsToCsv([])).toBe("repo,number,title,level,points,merged_at");
  });
});

describe("summarizePrs", () => {
  it("totals points, counts levels, and ranks repos", () => {
    const res = summarizePrs([
      pr("2026-08-24", 100, "Trivial", "o/a"),
      pr("2026-08-24", 150, "Medium", "o/a"),
      pr("2026-08-25", 200, "High", "o/b"),
    ]);
    expect(res.totalPoints).toBe(450);
    expect(res.levelCounts).toEqual([
      { level: "Trivial", count: 1 },
      { level: "Medium", count: 1 },
      { level: "High", count: 1 },
    ]);
    expect(res.repos).toEqual([
      { repo: "o/a", points: 250, count: 2 },
      { repo: "o/b", points: 200, count: 1 },
    ]);
  });

  it("handles an empty PR list", () => {
    const res = summarizePrs([]);
    expect(res.totalPoints).toBe(0);
    expect(res.levelCounts.every((c) => c.count === 0)).toBe(true);
    expect(res.repos).toEqual([]);
  });
});