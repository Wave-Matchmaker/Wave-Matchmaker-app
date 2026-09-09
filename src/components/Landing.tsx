import { useState } from "react";
import { joinWaitlist } from "../lib/waitlist";

type DemoView = "match" | "coach" | "budget" | "complexity" | "heatmaps" | "analytics";

type WaitlistStatus =
  | "idle"
  | "saving"
  | "done"
  | "duplicate"
  | "not-configured"
  | "error";

export default function Landing({ onNavigate }: { onNavigate: (view: DemoView) => void }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<WaitlistStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const address = email.trim().toLowerCase();
    if (!address) return;
    setStatus("saving");
    setErrorMsg(null);
    const res = await joinWaitlist(address);
    if (res.ok) {
      setStatus("done");
      setEmail("");
    } else if (res.reason === "duplicate") {
      setStatus("duplicate");
    } else if (res.reason === "not-configured") {
      setStatus("not-configured");
    } else {
      setStatus("error");
      setErrorMsg(res.message ?? "Couldn't save your email — please try again.");
    }
  }

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-20 pb-16 text-center">
        <p className="mb-4 inline-block rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1 text-sm text-cyan-300">
          AI strategy layer for Drips Wave
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
          Stop guessing.{" "}
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Start winning.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          Application limits and points budgets decide who wins a Wave. Wave
          Matchmaker tells developers where to apply and maintainers where to
          spend — with data, not vibes.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => onNavigate("match")}
            className="rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Try the Match Score demo →
          </button>
          <a
            href="#waitlist"
            className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-slate-200 transition hover:border-slate-500"
          >
            Join the waitlist
          </a>
        </div>
      </section>

      {/* Verified program numbers */}
      <section className="border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { value: "$75K", label: "reward pool per Stellar Wave since Wave 4 (Waves 1–3: $60K)" },
              { value: "8", label: "Stellar Waves run since January 2026" },
              { value: "251,981", label: "issues on the Stellar program — 737 repos · 442 orgs" },
              { value: "3,000+", label: "PRs merged in Wave 1 alone (~600 contributors)" },
            ].map((s) => (
              <div key={s.value}>
                <p className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-4xl font-extrabold text-transparent">
                  {s.value}
                </p>
                <p className="mt-2 text-sm text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-xs text-slate-500">
            From the live{" "}
            <a
              href="https://www.drips.network/wave/stellar"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:underline"
            >
              Stellar Wave page
            </a>{" "}
            and the Drips blog — verified Sep 8, 2026.
          </p>
        </div>
      </section>

      {/* Problem */}
      <section className="border-y border-slate-800 bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-bold sm:text-3xl">The Problem</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: "🚧",
                title: "Application limits",
                body: "Up to 15 pending applications, and max 4 assignments per org per Wave — every application you spend is a scarce bet.",
              },
              {
                icon: "💰",
                title: "Points budgets",
                body: "Maintainers work inside per-repo and per-org points budgets each Wave — a mispriced complexity level wastes it.",
              },
              {
                icon: "🕳️",
                title: "No public leaderboard",
                body: "Drips sunset the public leaderboard in Wave 4 (Apr 2026) — outside the app, nobody sees where they stand.",
              },
            ].map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
              >
                <div className="text-2xl">{c.icon}</div>
                <h3 className="mt-3 font-semibold text-white">{c.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold sm:text-3xl">The Solution</h2>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-semibold text-cyan-300">
              For Developers
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>
                <strong className="text-white">AI Match Score</strong> — a % match
                between your GitHub history and a specific issue, so applications
                go where they'll land.
              </li>
              <li>
                <strong className="text-white">Strategy Coach</strong> — which
                orgs and issues to prioritize given your remaining application
                slots.
              </li>
              <li>
                <strong className="text-white">Private Analytics</strong> — track
                your points and impact without a public leaderboard.
              </li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => onNavigate("match")}
                className="rounded-lg bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-300 ring-1 ring-cyan-500/30 transition hover:bg-cyan-500/25"
              >
                Try the Match Score demo →
              </button>
              <button
                onClick={() => onNavigate("analytics")}
                className="rounded-lg bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-300 ring-1 ring-cyan-500/30 transition hover:bg-cyan-500/25"
              >
                Try the Analytics demo →
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-semibold text-blue-300">
              For Maintainers
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>
                <strong className="text-white">Points Budget Optimizer</strong> —
                best points-vs-effort value within your per-repo and per-org caps.
              </li>
              <li>
                <strong className="text-white">Complexity Assistant</strong> —
                suggested Trivial / Medium / High rating from issue content.
              </li>
              <li>
                <strong className="text-white">Contributor Heatmaps</strong> —
                your most active and skilled contributors across repos.
              </li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => onNavigate("budget")}
                className="rounded-lg bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-300 ring-1 ring-blue-500/30 transition hover:bg-blue-500/25"
              >
                Try the Budget Optimizer demo →
              </button>
              <button
                onClick={() => onNavigate("complexity")}
                className="rounded-lg bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-300 ring-1 ring-blue-500/30 transition hover:bg-blue-500/25"
              >
                Try the Complexity Assistant demo →
              </button>
              <button
                onClick={() => onNavigate("heatmaps")}
                className="rounded-lg bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-300 ring-1 ring-blue-500/30 transition hover:bg-blue-500/25"
              >
                Try the Heatmaps demo →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Demos */}
      <section className="border-y border-slate-800 bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-bold sm:text-3xl">Try it live</h2>
          <p className="mt-2 max-w-2xl text-slate-400">
            Working demos on real GitHub data — no login, transparent v0 heuristics.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
                For developers
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">
                Match Score + Strategy Coach
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Score one issue, or paste several and get an application plan that respects
                your remaining slots.
              </p>
              <button
                onClick={() => onNavigate("coach")}
                className="mt-5 rounded-lg bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-300 ring-1 ring-cyan-500/30 transition hover:bg-cyan-500/25"
              >
                Try the Coach demo →
              </button>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">
                For maintainers
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">
                Points Budget Optimizer
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Point it at your org or repo and see which open issues are worth funding
                within this Wave's budget.
              </p>
              <button
                onClick={() => onNavigate("budget")}
                className="mt-5 rounded-lg bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-300 ring-1 ring-blue-500/30 transition hover:bg-blue-500/25"
              >
                Try the Budget demo →
              </button>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">
                For maintainers
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">
                Complexity Assistant
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Paste the issues you're about to price and get a suggested
                Trivial / Medium / High rating with the reasoning behind it.
              </p>
              <button
                onClick={() => onNavigate("complexity")}
                className="mt-5 rounded-lg bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-300 ring-1 ring-blue-500/30 transition hover:bg-blue-500/25"
              >
                Try the Complexity demo →
              </button>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
                For developers
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">
                Private Analytics
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Estimate your own points and impact over a wave window — your
                private view, no public leaderboard needed.
              </p>
              <button
                onClick={() => onNavigate("analytics")}
                className="mt-5 rounded-lg bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-300 ring-1 ring-cyan-500/30 transition hover:bg-cyan-500/25"
              >
                Try the Analytics demo →
              </button>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">
                For maintainers
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">
                Contributor Heatmaps
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                See your most active and skilled contributors across your repos,
                ranked with a contribution heatmap.
              </p>
              <button
                onClick={() => onNavigate("heatmaps")}
                className="mt-5 rounded-lg bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-300 ring-1 ring-blue-500/30 transition hover:bg-blue-500/25"
              >
                Try the Heatmaps demo →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Business model */}
      <section className="border-y border-slate-800 bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-bold sm:text-3xl">Business Model</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Free",
                price: "$0",
                items: ["Limited AI match checks per Wave", "Basic match score"],
                highlight: false,
              },
              {
                name: "Developer Pro",
                price: "monthly",
                items: [
                  "Unlimited match checks",
                  "Strategy coach",
                  "Private analytics",
                ],
                highlight: true,
              },
              {
                name: "Maintainer Pro",
                price: "monthly",
                items: ["Budget optimizer", "Complexity assistant", "Heatmaps"],
                highlight: false,
              },
            ].map((t) => (
              <div
                key={t.name}
                className={`rounded-2xl border p-6 ${
                  t.highlight
                    ? "border-cyan-500/50 bg-cyan-500/5 ring-1 ring-cyan-500/30"
                    : "border-slate-800 bg-slate-900"
                }`}
              >
                <h3 className="font-semibold text-white">{t.name}</h3>
                <p className="mt-1 text-sm text-slate-400">{t.price}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-300">
                  {t.items.map((i) => (
                    <li key={i}>✓ {i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section id="waitlist" className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">Get early access</h2>
        <p className="mt-3 text-slate-400">
          Join the waitlist and shape what we build first.
        </p>
        {status === "done" && (
          <p className="mt-8 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-6 py-4 text-emerald-300">
            You're on the list 🎉
          </p>
        )}
        {status === "duplicate" && (
          <p className="mt-8 rounded-xl border border-amber-500/40 bg-amber-500/10 px-6 py-4 text-amber-300">
            Already on the list — we've got you.
          </p>
        )}
        {status === "error" && (
          <p className="mt-8 rounded-xl border border-rose-500/40 bg-rose-500/10 px-6 py-4 text-sm text-rose-300">
            {errorMsg}
          </p>
        )}
        {status === "not-configured" && (
          <p className="mt-8 rounded-xl border border-slate-700 bg-slate-900 px-6 py-4 text-sm text-slate-400">
            Waitlist storage isn't connected yet — set{" "}
            <code className="text-cyan-300">VITE_SUPABASE_URL</code> and{" "}
            <code className="text-cyan-300">VITE_SUPABASE_ANON_KEY</code> in{" "}
            <code className="text-cyan-300">.env</code>, then run the SQL in{" "}
            <code className="text-cyan-300">supabase/setup.sql</code>.
          </p>
        )}
        {status !== "done" && status !== "duplicate" && (
          <form className="mt-8 flex flex-col gap-3 sm:flex-row" onSubmit={handleJoin}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={status === "saving"}
              className="rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
            >
              {status === "saving" ? "Joining…" : "Join waitlist"}
            </button>
          </form>
        )}
      </section>

      {/* Verified numbers & caveats */}
      <section className="mx-auto max-w-3xl px-4 pb-16">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">
          <p className="font-semibold text-white">Where the numbers come from</p>
          <p className="mt-2">
            Stats on this page were pulled from Drips' live pages on Sep 8, 2026. Application
            limits, complexity points, and budget caps are per-program configuration — confirm
            your program's exact values on your Drips dashboard.
          </p>
          <ul className="mt-4 space-y-1.5 text-slate-400">
            {[
              ["Contributor limits & leaderboard", "https://docs.drips.network/wave/contributors/solving-issues-and-earning-rewards/"],
              ["Complexity → 100 / 150 / 200 pts", "https://docs.drips.network/wave/points-and-rewards/"],
              ["Per-repo & per-org points budgets", "https://docs.drips.network/wave/maintainers/points-budgets/"],
              ["Live Stellar Wave program (waves, pools, scale)", "https://www.drips.network/wave/stellar"],
              ["Public leaderboard sunset (Wave 4 changelog)", "https://www.drips.network/blog/posts/wave-4-changelog"],
            ].map(([label, href]) => (
              <li key={href}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
