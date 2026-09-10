# Wave Matchmaker

**Tagline:** *"Stop guessing. Start winning."*

> ✅ All stats below were verified against Drips' live pages on **Sep 8, 2026** (sources at
> the bottom). Program caps are per-program configuration and can change — re-check your own
> dashboard before you publish anything with numbers attached.

---

## The Problem

Drips Wave runs recurring one-week "Wave" contribution sprints on a monthly cycle. Contributors
resolve curated GitHub issues and earn Points that convert into a share of the reward pool.

The Stellar Wave Program alone has run **8 waves since January 2026**. Its first Wave drew
**~600 participants who merged 3,000+ PRs across 200+ repos**, and the live program page
currently counts **251,981 issues · 737 repos · 442 orgs**. The most recent cycle, Stellar
Wave 8 (Aug 24–31, 2026), carried a **$75,000 reward pool**.

But the mechanics create friction:

- **Contributors face application limits.** Per current Drips docs: **up to 15 pending
  applications** at a time, and **at most 4 assigned issues per org per Wave**. The limits have
  been tightened repeatedly since Wave 2 — so every application you spend is a bet. *(The exact
  numbers for your program live on your application-limits dashboard.)*
- **Maintainers work within points budgets.** Wave Programs cap points per repo **and** per org
  each Wave (per-repo budgets were added in Wave 4, April 2026). Budget counts base points plus
  complexity bonus (Trivial **100** / Medium **150** / High **200**), before any featured-repo
  multiplier — so mispricing complexity wastes budget, and enforcement happens at add-time.
- **The public leaderboard is gone.** Drips sunset it starting with Stellar Wave 4 (April 2026)
  to shift focus from ranking-chasing to contribution quality. Standings are still visible
  in-app, but there's no public view of where you stand.

Result: developers spend scarce applications on issues they won't land, and maintainers
struggle to allocate a fixed points budget for maximum impact — without public visibility to
tell either side how it's going.

---

## The Solution

**Wave Matchmaker** is an AI assistant that helps both sides of a Wave make better decisions
with the information they already have.

### For Developers
- **AI Match Score** — a % match between a developer's GitHub history/skills and a specific issue, so applications go where they're likely to land.
- **Strategy Coach** — recommends which orgs/issues to prioritize given your current application-limit usage.
- **Private Analytics** — track your own points and impact over time, without needing a public leaderboard.

### For Maintainers
- **Points Budget Optimizer** — surfaces which issues give the best points-vs-effort value within your per-repo and per-org budget caps.
- **Complexity Level Assistant** — suggests a Trivial/Medium/High rating based on issue content, so budgets are allocated fairly and issues are correctly evaluated.
- **Contributor Heatmaps** — shows your most active/skilled contributors across your repos.

---

## Why Now

- Wave has real, growing volume: 8 waves since January 2026, with the Stellar program page
  now counting 251,981 issues, 737 repos, and 442 orgs. Pool sizes grew from $60K (Waves 1–3)
  to $75K (Waves 4–8).
- Points budgets (per repo **and** per org) and application limits are core to the current
  version of the program, which means *strategy* — not just effort — now determines outcomes.
- Cadence is monthly. As of Sep 8, 2026 there is no active or upcoming Wave; the next Stellar
  Wave is expected in late September 2026. Pool and timing come from the live Wave page before
  you quote them.

---

## Business Model

- **Free tier**: limited number of AI match checks per Wave.
- **Developer Pro**: monthly subscription for unlimited matches + strategy coach.
- **Maintainer Pro**: monthly subscription for budget optimizer + heatmaps.

Any revenue/valuation projection (e.g. "$X MRR at Y subscribers") is a **target model, not
current traction**, until there are real signups. Label it that way explicitly in investor
materials — claiming a hypothetical as an achieved number is the fastest way to lose
credibility with anyone who reads closely.

---

## The Vision

Wave Matchmaker aims to be the default strategy layer for anyone seriously participating in
Drips Wave — turning a capped, competitive system into something contributors and maintainers
can navigate with actual data instead of guesswork.

---

## The Ask

- **Developers**: join the waitlist.
- **Maintainers**: tell us your specific points-budget pain points — this shapes what we build first.
- **Investors**: happy to walk through the mechanics of Drips Wave and where the wedge is, backed by sourced numbers.

---

## Posting Guide

| Where | What to use |
|---|---|
| Discord / Telegram | Problem + Solution sections, trimmed |
| Twitter / LinkedIn | Tagline + Why Now (with sourced numbers) + waitlist link |
| Investor deck | Full doc — numbers below are sourced and current as of Sep 8, 2026 |
| Landing page | Tagline, Solution, Business Model, verified stats |

---

## Sources & Verification (all accessed Sep 8, 2026)

- **Stellar Wave program page** (waves, dates, pools, scale counters — 251,981 issues · 737
  repos · 442 orgs · 8 waves; no active Wave as of Sep 8): https://www.drips.network/wave/stellar
- **Docs — Solving Issues & Earning Rewards** (15 pending applications; max 4 assignments per
  org per Wave; leaderboard in-app): https://docs.drips.network/wave/contributors/solving-issues-and-earning-rewards/
- **Docs — Understanding Points & Rewards** (Trivial 100 / Medium 150 / High 200):
  https://docs.drips.network/wave/points-and-rewards/
- **Docs — Points Budgets** (per-repo + per-org caps; counted pre-multiplier; reset per Wave):
  https://docs.drips.network/wave/maintainers/points-budgets/
- **Wave 4 changelog** (public leaderboard sunset; per-repo budgets introduced; application
  limits tightened): https://www.drips.network/blog/posts/wave-4-changelog
- **Wave 2 changelog** (Wave 1 results: ~600 participants, 3,000+ PRs, 200+ repos):
  https://www.drips.network/blog/posts/wave-2-changelog
- **Wave hub** (programs + latest changelogs): https://www.drips.network/wave

---

## Before You Publish — Checklist

- [x] Application limit confirmed: **15 pending applications; max 4 assigned per org per Wave**
      (current Drips docs). Re-confirm on your own dashboard before each publish — limits have
      been tightened repeatedly.
- [x] Wave name + pool confirmed: latest was **Stellar Wave 8 (Aug 24–31, 2026), $75,000**;
      **no active or upcoming Wave** as of Sep 8, 2026. Check the live page for the next one.
- [x] Leaderboard status confirmed: **public leaderboard sunset since Stellar Wave 4** (Apr
      2026); standings are in-app only.
- [x] "$100M+ ecosystem" claim: not present anywhere in this deck — nothing to source or remove.
- [x] Revenue projections labeled as **target model, not current traction**.

---

## Local development

Vite + React + TypeScript + Tailwind v4. Demo tools fetch live public GitHub data
(unauthenticated, ~60 req/hr core API + separate search quota).

```bash
npm install
npm run dev        # start dev server
npm run typecheck # typecheck only
npm test          # run unit tests (vitest)
npm run build     # typecheck + production build (outputs to dist/)
```

Views: **Match Score** (score a dev against one issue), **Coach** (plan which of several
issues to apply to given remaining slots), **Budget** (maintainer points-budget allocator
across an org/repo's open issues), **Complexity** (maintainer tool that suggests a
Trivial / Medium / High rating for pasted issues), **Heatmaps** (maintainer view of the most
active/skilled contributors across an org's or repo's public history), **Analytics**
(developer tool estimating your own points/impact from merged PRs in a wave window, with a
previous-period comparison and CSV export). All scoring is a transparent v0 heuristic, not an
LLM call. The Budget, Complexity, and Analytics tools default to the current Stellar Wave
complexity values (100 / 150 / 200 pts).

### Waitlist storage (Supabase)

The waitlist form persists to a Supabase Postgres table. Until configured it shows a clear
"not connected" message instead of pretending to save.

1. Create a project and copy the project URL + anon key (Dashboard → Project Settings → API)
   into a local `.env` (see `.env.example`):
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
2. Run `supabase/setup.sql` once in the Supabase SQL Editor. It creates the `waitlist` table
   and an insert-only RLS policy: anon clients can add rows but never read, update, or delete them.
3. Submit a test email on the landing page and check it appears in Table Editor.
