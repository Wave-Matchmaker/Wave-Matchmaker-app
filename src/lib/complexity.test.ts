import { describe, expect, it } from "vitest";
import { LEVELS, summarizeAssessments } from "./complexity";

describe("summarizeAssessments", () => {
  it("counts assessments per level and sums total points", () => {
    const { counts, totalPoints } = summarizeAssessments([
      { level: "Trivial", points: 100 },
      { level: "Medium", points: 150 },
      { level: "Medium", points: 150 },
      { level: "High", points: 200 },
    ]);
    expect(counts).toEqual([
      { level: "Trivial", count: 1 },
      { level: "Medium", count: 2 },
      { level: "High", count: 1 },
    ]);
    expect(totalPoints).toBe(600);
  });

  it("always reports all three levels, even when a level is absent", () => {
    const { counts } = summarizeAssessments([
      { level: "High", points: 200 },
    ]);
    expect(counts).toEqual([
      { level: "Trivial", count: 0 },
      { level: "Medium", count: 0 },
      { level: "High", count: 1 },
    ]);
  });

  it("returns zero counts and zero points for an empty list", () => {
    const { counts, totalPoints } = summarizeAssessments([]);
    expect(counts.map((c) => c.count)).toEqual([0, 0, 0]);
    expect(totalPoints).toBe(0);
  });

  it("respects custom per-level point values", () => {
    const { totalPoints } = summarizeAssessments([
      { level: "Trivial", points: 50 },
      { level: "High", points: 250 },
    ]);
    expect(totalPoints).toBe(300);
  });

  it("counts every assessment exactly once regardless of order", () => {
    const { counts } = summarizeAssessments([
      { level: "Medium", points: 150 },
      { level: "Trivial", points: 100 },
      { level: "High", points: 200 },
      { level: "Trivial", points: 100 },
    ]);
    expect(counts).toEqual([
      { level: "Trivial", count: 2 },
      { level: "Medium", count: 1 },
      { level: "High", count: 1 },
    ]);
  });
});

describe("LEVELS", () => {
  it("exposes Trivial, Medium, High in display order", () => {
    expect(LEVELS).toEqual(["Trivial", "Medium", "High"]);
  });
});