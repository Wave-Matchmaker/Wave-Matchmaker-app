import { useState } from "react";
import Landing from "./components/Landing";
import MatchScore from "./components/MatchScore";
import Coach from "./components/Coach";
import BudgetOptimizer from "./components/BudgetOptimizer";

export type View = "landing" | "match" | "coach" | "budget";

const NAV: { view: View; label: string }[] = [
  { view: "landing", label: "Home" },
  { view: "match", label: "Match Score" },
  { view: "coach", label: "Coach" },
  { view: "budget", label: "Budget" },
];

export default function App() {
  const [view, setView] = useState<View>("landing");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <button
            onClick={() => setView("landing")}
            className="text-lg font-bold tracking-tight"
          >
            🌊 Wave Matchmaker
          </button>
          <div className="flex flex-wrap gap-1.5">
            {NAV.map((item) => (
              <button
                key={item.view}
                onClick={() => setView(item.view)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  view === item.view
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {view === "landing" && <Landing onNavigate={setView} />}
      {view === "match" && <MatchScore onBack={() => setView("landing")} />}
      {view === "coach" && <Coach onBack={() => setView("landing")} />}
      {view === "budget" && <BudgetOptimizer onBack={() => setView("landing")} />}

      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-500">
        Wave Matchmaker — an unofficial community tool. Not affiliated with
        Drips Network.
      </footer>
    </div>
  );
}
