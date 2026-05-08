# Buyer Context Skills for AI Agents

A 12-skill audit collection that simulates how AI buying agents read your site — and produces a gap report your own agents can close.

When a buyer asks ChatGPT, Claude, Gemini, or Perplexity to "find me a \<category\> for \<my situation\>", the model visits a handful of vendor sites and decides which ones make the shortlist. This suite runs that same pass against your site, scoring each surface on whether an agent can extract your offer, locate your price, verify your ICP fit, cite your proof, and progress without a human. The output is a structured `./reports/` directory: deficiencies, prioritized, in a form your repair agents can act on directly.

Works with Claude Code, OpenAI Codex, Cursor, Windsurf, and any runtime that supports Agent Skills.

## Prerequisites

- An agent runtime that supports Agent Skills — [Claude Code](https://docs.claude.com/en/docs/claude-code/overview), OpenAI Codex, Cursor, Windsurf, or similar.
- Skills are installed via `npx skills add` and invoked with `/skill-name`.
- Node.js 18+ on `PATH`.

No API keys required for the core flow. `BRAVE_API_KEY` is optional — see [Optional environment](#optional-environment).

## Install

```bash
npx skills add RevensiAI/buyer-context
```

Installs all 12 skills under `~/.claude/skills/`. Individual skills install the same way:

```bash
npx skills add RevensiAI/buyer-context/homepage-audit
```

## Quickstart

Run these inside your agent, from the directory you want reports to land in. Order matters: the anchor (step 1) is what every audit reads for alignment scoring.

1. **Define your buyer context** (one-time, ~3 minutes — site-grounded options, near-zero typing):

   ```
   /buyer-context
   ```

   Writes `./buyer-context.md` — your ICP, positioning, USP, proof points, and CTA patterns. See [About `/buyer-context`](#about-buyer-context) for what makes this the anchor every other audit reads.

2. **Audit your crawl-layer infrastructure** (robots.txt, sitemap, llms.txt, JSON-LD, anti-bot rules):

   ```
   /crawler-audit
   ```

3. **Audit a single surface** or **the whole site**:

   ```
   /homepage-audit https://example.com
   /full-audit example.com
   ```

Reports land in `./reports/`. `full-audit` runs skills 2–10 in parallel and writes a synthesized cross-surface report.

Skip step 1 and `/full-audit` or `/competitor-audit` will notice the missing anchor and offer to chain in `/buyer-context` for you — so a cold start at step 3 is fine.

### How fetching works

Each skill ships small Node scripts under `<skill>/scripts/`:

- `audit-fetch.mjs` — page fetcher returning structured JSON (parsed JSON-LD, OG/Twitter, canonical, headings, anti-bot signals, `visibleText`).
- `audit-robots.mjs` — fetches and parses `robots.txt` into a per-bot allow/disallow matrix for the AI-bot panel.
- `audit-sitemap.mjs` — sitemap URL count, freshness, sitemap-index walking.
- `audit-uatest.mjs` — fetches the same URL with browser, GPTBot, and curl UAs and diffs the responses (the only reliable anti-bot detector).
- `audit-find-competitors.mjs` (competitor-audit only) — Brave Search competitor discovery.

Throughout the SKILL.md files, `./scripts/<name>.mjs` refers to a script under the **skill's** folder (typically `~/.claude/skills/<skill>/scripts/<name>.mjs` after install). Bash runs in your project CWD, so the model invokes scripts by absolute install path while reports and the cache land in your project directory.

Responses cache to `./.audit-cache/` in your CWD (sha-keyed by URL+UA), so re-runs are instant and parallel subagents share the cache. On first run, `.audit-cache/` and `reports/` are appended to `.gitignore` if one exists.

### Re-audit cadence

To track progress over time, schedule a periodic re-run with the `/loop` skill:

```
/loop 30d /full-audit example.com
```

The cache makes monthly re-runs cheap; a fresh `./reports/full-audit-report.md` lands every 30 days.

## About `/buyer-context`

`/buyer-context` is the anchor of the suite. Every other audit reads `./buyer-context.md` to score the **Buyer-Context Alignment** dimension. Without it, audits drop to "no-anchor mode" and give generic feedback ("your headline could be more specific"). With it, audits become matchmaking — *"your homepage says 'platform for teams' but your buyer is engineering managers at Series B startups replacing Jenkins, and you never name them."*

The asset is also reusable beyond this suite. Any repair agent, content rewriter, ad-copy generator, or sales-enablement tool can read the same file — it's plain Markdown with stable headings, diffable in git, durable across runtimes.

### Why it takes ~3 minutes, not 3 hours

Most "fill out an ICP doc" exercises fail because they're blank-page typing. This one front-loads inference before asking anything:

- Fetches your homepage + `/pricing` + `/customers` in parallel via `audit-fetch.mjs`, then builds an internal evidence bundle (brand, tagline, CTA copy, pricing tiers, testimonial titles, vertical clusters, recurring noun phrases, competitor mentions, numeric claims, certification badges, recent press).
- **Auto-fills 5 high-confidence fields silently** — Brand, Site, Tagline, Primary CTA, Category — and surfaces them at the final review screen.
- Asks the remaining ~17 fields one at a time, each as a click-through with 2–4 options *derived from your site copy* plus an auto-appended "Other" for free text. Each option's description tells you *why* it's a candidate ("your CTAs say…", "your /pricing tiers are…").
- Even prose-shaped fields — JTBD, one-sentence pitch, USP, core differentiating claim — are presented as 2–3 candidate phrasings synthesized from your hero and `/features` copy. You click rather than type.

Net effect: ~17 clicks, not 17 essays.

### What it captures

The output file follows a stable schema (audit skills grep for these headings, so they don't change):

- **Brand & Product** — name, primary product, site, category, current tagline.
- **ICP** — segment, sales motion, company size, vertical, geography, buyer titles, user titles, anti-ICP.
- **Job-to-be-Done** — primary JTBD in "When I'm X, I want to Y, so I can Z" form, trigger event, current alternative, switching cost.
- **Positioning** — one-sentence pitch, USP, core differentiating claim, why now.
- **Proof Points** — 3–5 cite-able, dated, sourced facts an LLM should be able to quote.
- **Must-Win Verticals** — the 1–3 segments that matter most this quarter (audits weight alignment to these higher).
- **Distinguishing Vocabulary** — words to *use*, words to *avoid*.
- **Failure Modes of Incumbents** — what's broken about the obvious alternative.
- **Primary Conversion Action** — primary CTA, secondary CTA, anti-CTA.

Full schema: [`shared/buyer-context.spec.md`](shared/buyer-context.spec.md).

### Staying current

Re-running `/buyer-context` on a site that already has the file re-fetches your site (so it can diff against current evidence) and offers three modes:

- **Refresh stale fields only** *(default)* — only asks fields where site evidence has measurably changed since the last update, OR the file is older than 90 days AND the field is in the high-decay set (Tagline, Primary CTA, Proof Points, Why Now).
- **Walk all questions** — same as the new-file flow, but every question prepends "Keep current: \<value\>" as the first option.
- **Replace from scratch** — discards the existing file.

Audits use the `*Last updated: <YYYY-MM-DD>*` line to flag staleness. A typical cadence is once per quarter, or whenever positioning shifts (new ICP, new tagline) or audits start flagging low Buyer-Context Alignment across multiple surfaces — that often means the anchor itself drifted from the site.

## What a report looks like

Each audit produces a markdown file with a composite score, per-dimension breakdown, and prioritized findings — the gap your repair agents will close. Example header from `./reports/homepage-audit.md`:

~~~markdown
# Homepage Audit — example.com
*Generated 2026-05-07. Buyer context: ./buyer-context.md (loaded).*

## Composite Score: 6.4 / 10

| Dimension                     | Score | Weight | Weighted |
|-------------------------------|-------|--------|----------|
| Extractability                | 8     | 2      | 16       |
| Schema & Structured Data      | 4     | 2      | 8        |
| Buyer-Context Alignment       | 7     | 3      | 21       |
| Trust & Citation-Worthiness   | 6     | 2      | 12       |
| Agent-Actionability           | 5     | 1      | 5        |
| Crawler Accessibility         | 9     | 1      | 9        |
| **Total**                     |       | **11** | **71 / 110 = 6.4** |
~~~

Below the table, each report lists what's working, what's broken, and prioritized fixes ranked by impact × ease.

## The skills

| # | Skill | What it does | Output |
|---|-------|--------------|--------|
| 1 | `buyer-context` | Guided Q&A → canonical positioning doc | `./buyer-context.md` |
| 2 | `crawler-audit` | robots.txt, sitemap, llms.txt, JSON-LD, anti-bot | `./reports/crawler-audit.md` |
| 3 | `homepage-audit` | Homepage agent-shortlist score | `./reports/homepage-audit.md` |
| 4 | `pricing-audit` | Pricing page (Offer schema, plans, terms) | `./reports/pricing-audit.md` |
| 5 | `about-audit` | About/Team (Organization + Person schema) | `./reports/about-audit.md` |
| 6 | `comparison-audit` | /vs/ pages (factual claims, competitor names) | `./reports/comparison-audit.md` |
| 7 | `features-audit` | Feature page (feature→JTBD, integrations) | `./reports/features-audit.md` |
| 8 | `case-study-audit` | Case studies (named customer, dated, quantified) | `./reports/case-study-audit.md` |
| 9 | `faq-audit` | FAQ (FAQPage schema, atomic Q/A) | `./reports/faq-audit.md` |
| 10 | `agent-page` | Audit OR build a `/for-ai-agents` page | `./reports/agent-page[-generated].md` |
| 11 | `competitor-audit` | Competitor's site through the same lens | `./reports/competitor-audit.md` + `competitor-context.md` |
| 12 | `full-audit` | Orchestrates 2–10 in parallel, synthesizes | `./reports/full-audit-report.md` |

## The rubric

Every audit scores six dimensions 1–10, with surface-specific weights:

1. **Extractability** — plain-text clarity (no JS-only content)
2. **Schema & Structured Data** — JSON-LD: Organization, Product, Offer, FAQPage, Article, etc.
3. **Buyer-Context Alignment** — does the page match the ICP and positioning in `buyer-context.md`?
4. **Trust & Citation-Worthiness** — named, dated, sourced proof models will cite
5. **Agent-Actionability** — can an agent take the next step without a human?
6. **Crawler Accessibility** — AI bots (GPTBot, ClaudeBot, etc.) allowed; llms.txt present

Full rubric: [`shared/audit-engine.md`](shared/audit-engine.md).

## Optional environment

- `BRAVE_API_KEY` — enables `competitor-audit` to discover competitors via Brave Search (`audit-find-competitors.mjs`) when no URL is given. Free tier at [brave.com/search/api](https://brave.com/search/api/). Without it, competitor-audit asks you to confirm competitor names directly.

## Repository layout

```
buyer-context/
├── README.md                  ← you are here
├── shared/                    ← maintainer source of truth (NOT installed)
│   ├── audit-engine.md
│   ├── ai-bots.md
│   ├── buyer-context.spec.md
│   └── scripts/
│       ├── audit-fetch.mjs
│       ├── audit-robots.mjs
│       ├── audit-sitemap.mjs
│       ├── audit-uatest.mjs
│       ├── audit-find-competitors.mjs
│       └── sync-references.mjs   ← maintainer tool, not propagated
├── buyer-context/             ← skill folders (each installed standalone)
│   ├── SKILL.md
│   ├── references/
│   └── scripts/
├── crawler-audit/
├── homepage-audit/
├── ...
└── full-audit/
```

`shared/` is the canonical authored copy. Each skill ships its own runtime copies under `references/` and `scripts/` so it works standalone after `npx skills add` installs just that one folder.

**Maintainers**: edit canonical files in `shared/` only, then run:

```bash
node shared/scripts/sync-references.mjs
```

`sync-references` propagates `shared/audit-engine.md`, `shared/ai-bots.md`, `shared/buyer-context.spec.md`, and the runtime scripts into the right per-skill folders. Re-running it is idempotent (skips byte-identical files).

## Contributing

Contributions welcome — issues, PRs, new skill ideas, rubric refinements. Open a PR or file an issue on [GitHub](https://github.com/RevensiAI/buyer-context).

## About

Built and maintained by [Revensi](https://revensi.com) — agent-led growth for B2B SaaS.

## License

MIT. See `LICENSE`.
