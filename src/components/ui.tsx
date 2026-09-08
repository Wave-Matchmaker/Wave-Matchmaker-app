/** Shared little UI pieces for the demo views. */

export const inputCls =
  "rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-500";

export function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 70 ? "text-emerald-400" : score >= 45 ? "text-amber-400" : "text-rose-400";
  return (
    <div className="flex items-center gap-4">
      <div
        className={`flex h-24 w-24 items-center justify-center rounded-full border-4 ${color.replace("text-", "border-")} bg-slate-900`}
      >
        <span className={`text-3xl font-extrabold ${color}`}>{score}</span>
      </div>
      <div className="text-sm text-slate-400">
        <p className="font-semibold text-white">AI Match Score</p>
        <p>v0 heuristic — deterministic, explainable</p>
      </div>
    </div>
  );
}

export function LevelChip({ level }: { level: "Trivial" | "Medium" | "High" }) {
  const cls =
    level === "Trivial"
      ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
      : level === "Medium"
        ? "bg-amber-500/10 text-amber-300 ring-amber-500/30"
        : "bg-rose-500/10 text-rose-300 ring-rose-500/30";
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${cls}`}
    >
      {level}
    </span>
  );
}
