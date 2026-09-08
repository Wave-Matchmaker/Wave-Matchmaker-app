import { useState } from "react";
import Landing from "./components/Landing";
import MatchScore from "./components/MatchScore";

type View = "landing" | "match";

export default function App() {
  const [view, setView] = useState<View>("landing");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <button
            onClick={() => setView("landing")}
            className="text-lg font-bold tracking-tight"
          >
            🌊 Wave Matchmaker
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setView("landing")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                view === "landing"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setView("match")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                view === "match"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Match Score
            </button>
          </div>
        </div>
      </nav>

      {view === "landing" ? (
        <Landing onTryDemo={() => setView("match")} />
      ) : (
        <MatchScore onBack={() => setView("landing")} />
      )}

      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-500">
        Wave Matchmaker — an unofficial community tool. Not affiliated with
        Drips Network.
      </footer>
    </div>
  );
}
