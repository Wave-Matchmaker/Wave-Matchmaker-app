import { useState } from "react";

function VerifyBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-amber-500/30">
      {children}
    </span>
  );
}

export default function Landing({ onTryDemo }: { onTryDemo: () => void }) {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

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
            onClick={onTryDemo}
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

      {/* Problem */}
      <section className="border-y border-slate-800 bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-bold sm:text-3xl">The Problem</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: "🚧",
                title: "Application limits",
                body: "Capped pending applications and per-org caps mean every application you spend is a bet.",
              },
              {
                icon: "💰",
                title: "Points budgets",
                body: "Maintainers allocate a fixed points budget per Wave — mispriced complexity wastes it.",
              },
              {
                icon: "🕳️",
                title: "No visibility",
                body: "Without a reliable leaderboard, nobody knows where they actually stand.",
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
        {joined ? (
          <p className="mt-8 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-6 py-4 text-emerald-300">
            You're on the list 🎉 (demo — connect a backend to persist signups)
          </p>
        ) : (
          <form
            className="mt-8 flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) setJoined(true);
            }}
          >
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
              className="rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Join waitlist
            </button>
          </form>
        )}
      </section>

      {/* Honesty note mirroring the README checklist */}
      <section className="mx-auto max-w-3xl px-4 pb-16">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-sm text-amber-200/90">
          <p className="font-semibold">Before we publish numbers:</p>
          <p className="mt-2">
            All program stats on this page are placeholders. Live numbers ({" "}
            <VerifyBadge>application limits</VerifyBadge>{" "}
            <VerifyBadge>reward pool</VerifyBadge>{" "}
            <VerifyBadge>leaderboard status</VerifyBadge> ) get filled in from
            the Drips dashboard before launch — see the checklist in{" "}
            <code>README.md</code>.
          </p>
        </div>
      </section>
    </main>
  );
}
