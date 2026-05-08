# Buyer Context Skills for AI Agents

A 12-skill audit collection for the way **AI-mediated B2B buyers** make purchase decisions today — agents on ChatGPT, Claude, Gemini, and Perplexity that research vendors and build shortlists on behalf of the humans buying your software.

When a buyer briefs their AI assistant with "find me a \<category\> for \<my situation\>", the agent visits a handful of vendor sites and decides which ones make the cut. This collection scores whether your site survives that pass: can the agent extract your offer, find your price, see your ICP fit, cite your proof, and progress without a human? It's a different lens from SEO — the AI shortlist is the new gatekeeper.

Works with Claude Code, OpenAI Codex, Cursor, Windsurf, and any agent that supports Agent Skills.

## Prerequisites

- An agent that supports Agent Skills — [Claude Code](https://docs.claude.com/en/docs/claude-code/overview), OpenAI Codex, Cursor, Windsurf, or similar.
- Skills are installed via `npx skills add` and invoked with `/skill-name`.
- Node.js 18+ on `PATH` (the per-skill scripts use built-in `fetch`).

That's it — no API keys required for the core flow. `BRAVE_API_KEY` is optional (see [Optional environment](#optional-environment)).

## Install

```bash
npx skills add RevensiAI/buyer-context
```

This installs all 12 skills under `~/.claude/skills/`. You can also install individual skills:

```bash
npx skills add RevensiAI/buyer-context/homepage-audit
```

## Quickstart

Run these inside your agent, from the directory you want reports to land in. The order matters: the anchor (step 1) is what every audit reads for alignment scoring.

1. **Define your buyer context** (one time, ~5 minutes of guided Q&A):

   ```
   /buyer-context
   ```

   Writes `./buyer-context.md` — your ICP, positioning, USP, proof points, and CTA patterns.

2. **Audit your crawl-layer infrastructure** (robots.txt, sitemap, llms.txt, JSON-LD, anti-bot rules):

   ```
   /crawler-audit
   ```

3. **Audit a single surface** or **the whole site**:

   ```
   /homepage-audit https://example.com
   /full-audit example.com
   ```

Reports land in `./reports/`. `full-audit` orchestrates skills 2–10 in parallel and writes a synthesized cross-surface report.

If you skip step 1, `/full-audit` and `/competitor-audit` notice the missing anchor and offer to chain in `/buyer-context` for you — so you can also start at step 3 cold.

### How fetching works

Each skill ships small Node scripts under `<skill>/scripts/`:

- `audit-fetch.mjs` — page fetcher returning structured JSON (parsed JSON-LD, OG/Twitter, canonical, headings, anti-bot signals, `visibleText`).
- `audit-robots.mjs` — fetches and parses `robots.txt` into a per-bot allow/disallow matrix for the AI-bot panel.
- `audit-sitemap.mjs` — sitemap URL count, freshness, sitemap-index walking.
- `audit-uatest.mjs` — fetches the same URL with browser/GPTBot/curl UAs and diffs the responses (the only reliable anti-bot detector).
- `audit-find-competitors.mjs` (competitor-audit only) — Brave Search competitor discovery.

Throughout the SKILL.md files, `./scripts/<name>.mjs` refers to a script under the **skill's** folder (typically `~/.claude/skills/<skill>/scripts/<name>.mjs` after install). Bash runs in your project CWD, so the model invokes scripts using their absolute install path while reports and the cache land in your project directory.

Responses cache to `./.audit-cache/` in your CWD (sha-keyed by URL+UA), so re-running an audit is instant and parallel subagents share the cache. On first run, both `.audit-cache/` and `reports/` are appended to your `.gitignore` if one exists.

### Re-audit cadence

To track progress over time, schedule a periodic re-audit using the [`/loop`](https://github.com/anthropics/superpowers) skill:

```
/loop 30d /full-audit example.com
```

The cache makes monthly re-runs cheap; a fresh `./reports/full-audit-report.md` lands every 30 days.

## What a report looks like

Each audit produces a markdown file with a composite score, per-dimension breakdown, and prioritized findings. Example header from `./reports/homepage-audit.md`:

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

Below the score table, each report lists what's working, what's broken, and prioritized fixes ranked by impact × ease.

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
3. **Buyer-Context Alignment** — does the page match the ICP/positioning in `buyer-context.md`?
4. **Trust & Citation-Worthiness** — named, dated, sourced proof models will cite
5. **Agent-Actionability** — can an agent take the next step without a human?
6. **Crawler Accessibility** — AI bots (GPTBot, ClaudeBot, etc.) allowed; llms.txt present

Full rubric: [`shared/audit-engine.md`](shared/audit-engine.md).

## Optional environment

- `BRAVE_API_KEY` — enables `competitor-audit` to auto-discover competitors via Brave Search (`audit-find-competitors.mjs`) when no URL is given. Free tier at [brave.com/search/api](https://brave.com/search/api/). Without it, competitor-audit asks the user to confirm competitor names instead.

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

Contributions are welcome — issues, PRs, new skill ideas, and rubric refinements. Open a PR or file an issue on [GitHub](https://github.com/RevensiAI/buyer-context).

## About

Built and maintained by [Revensi](https://revensi.com) — agent-led growth for B2B SaaS.

## License

MIT. See `LICENSE`.
