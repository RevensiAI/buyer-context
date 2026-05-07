# buyer-context

A 12-skill collection for Claude Code that audits a website **for AI/LLM readability** — how well language models and the agents that act on behalf of buyers can crawl, parse, understand, and cite your site.

This is not SEO. It's a different lens: when an agent visits your homepage on a buyer's behalf, can it pull out your offer in plain text, find your price, see Organization schema, and progress without a human?

## Prerequisites

- [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) installed and authenticated.
- Skills are installed via `npx skills add` and invoked with `/skill-name` inside Claude Code.

That's it — no API keys required for the core flow. `BRAVE_API_KEY` is optional (see [Optional environment](#optional-environment)).

## Install

```bash
npx skills add github:RevensiAI/buyer-context
```

This installs all 12 skills under `~/.claude/skills/`. You can also install individual skills:

```bash
npx skills add github:RevensiAI/buyer-context/homepage-audit
```

## Quickstart

Run these inside Claude Code, from the directory you want reports to land in. The order matters: the anchor (step 1) is what every audit reads for alignment scoring.

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
| 3 | `homepage-audit` | Homepage AI-readability score | `./reports/homepage-audit.md` |
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

- `BRAVE_API_KEY` — enables `competitor-audit` to discover competitors via Brave Search when no URL is given. Without it, competitor-audit requires a competitor URL as input.

## Repository layout

```
buyer-context/
├── README.md                  ← you are here
├── shared/                    ← maintainer source of truth (NOT installed)
│   ├── audit-engine.md
│   └── buyer-context.spec.md
├── buyer-context/             ← skill folders (each installed standalone)
│   ├── SKILL.md
│   └── references/
├── crawler-audit/
├── homepage-audit/
├── ...
└── full-audit/
```

`shared/` is the canonical authored copy of the rubric and buyer-context schema. Each skill ships its own runtime copy under `references/` so it works standalone after `npx skills add` installs just that one folder. **Maintainers**: when editing rubric content in `shared/`, propagate the change into each `*/references/audit-engine.md`.

## License

MIT. See `LICENSE`.
