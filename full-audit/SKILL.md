---
name: full-audit
description: Use when the user wants a comprehensive AI/LLM-readability audit of their entire site — homepage, pricing, about, /vs/, features, case studies, FAQ, /for-ai-agents, plus crawler accessibility. Triggers on "audit my site", "full audit", "complete site audit", "audit example.com", or any request that's broader than a single page. Discovers key URLs from the sitemap and homepage, runs crawler-audit synchronously, then dispatches per-surface audits as parallel subagents and synthesizes a cross-surface report with the top fixes ranked by impact-times-ease.
---

# full-audit

## Overview

Orchestrates the full collection: discovers key URLs, runs `crawler-audit` synchronously, dispatches per-surface audits as parallel subagents via the **Task tool**, then synthesizes a cross-surface report with prioritized fixes.

**Core principle:** Subagents are dispatched with **fully self-contained prompts** — they don't need any other skill installed in their context, they don't reach for files outside what's pasted in. The orchestrator is the only piece that needs the full collection installed.

This pattern is from `superpowers:dispatching-parallel-agents`: each subagent gets focused scope, all needed context, and a specified output path.

## Inputs

- A site domain or homepage URL.
- **Required:** `./buyer-context.md` (the orchestrator pastes its full contents into each subagent prompt for alignment scoring).

## Outputs

- `./reports/crawler-audit.md` (synchronous step)
- `./reports/<surface>-audit.md` for each discovered surface (one per parallel subagent)
- `./reports/full-audit-report.md` (final synthesis)

## Workflow

### Step 1 — Anchor (auto-bootstrap if missing)

If `./buyer-context.md` exists, read it and proceed.

If it doesn't, do **not** refuse. Use `AskUserQuestion` to offer a chained run of `/buyer-context`:

```
AskUserQuestion({
  questions: [{
    header: "Anchor missing",
    question: "No ./buyer-context.md found. Alignment scoring needs it. Run /buyer-context now (~2 min, mostly click-through)?",
    multiSelect: false,
    options: [
      { label: "Run /buyer-context now",  description: "I'll guide you through ~17 click-through questions, write the anchor, then continue this audit (recommended)." },
      { label: "Continue without it",      description: "Run in no-anchor mode: every per-surface audit scores Buyer-Context Alignment at 5/10 with a low-confidence flag." },
      { label: "Cancel",                    description: "Stop the audit so I can write the anchor manually first." }
    ]
  }]
})
```

If the user picks "Run /buyer-context now": invoke the buyer-context skill flow inline (it lives in this collection). On completion, continue to Step 2 with the freshly written anchor.

If the user picks "Continue without it": set `noAnchorMode = true` and proceed; flag every subagent prompt accordingly so the report header carries the warning.

If the user picks "Cancel": stop.

The Buyer-Context Alignment dimension is the most differentiated of the rubric; without an anchor the audit is generic — that's why bootstrap is the recommended path.

### Step 2 — Crawler audit (synchronous)

Run the equivalent of `crawler-audit` first using the scripts shipped in this skill folder:

- `node ./scripts/audit-robots.mjs <domain>` — bot matrix + sitemap directives.
- `node ./scripts/audit-sitemap.mjs <domain-or-sitemap-url>` — URL count + freshness.
- `node ./scripts/audit-uatest.mjs <homepage-url>` — anti-bot detection across browser/GPTBot/curl UAs.
- `node ./scripts/audit-fetch.mjs https://<domain>/llms.txt` (and `/llms-full.txt`) — discovery aids.
- `node ./scripts/audit-fetch.mjs https://<domain>` — homepage HTML signals (headings, OG, JSON-LD, canonical, hreflangs).

This step is sequential because:
- The sitemap discovered here informs URL discovery in Step 3.
- The bot allow/disallow matrix informs what subsequent audits should report.
- The cache populated here serves the parallel subagents in Step 4 (they hit `.audit-cache/` instead of refetching).

Either:
- (a) Inline the full `crawler-audit` workflow here (preferred — keeps full-audit self-contained), or
- (b) If the user prefers separation, dispatch a single subagent with the crawler-audit prompt and wait for it.

Output: `./reports/crawler-audit.md`.

### Step 3 — URL discovery

From the sitemap (preferred — already parsed by `audit-sitemap.mjs` in Step 2) and the homepage's primary navigation (read the homepage's `cachePath` from Step 2's cache to inspect `<a href>` links), discover canonical URLs for these surfaces. Use the heuristics below; if a surface isn't found, mark it absent and note in the final report.

| Surface | Discovery patterns (in priority order) |
|---------|----------------------------------------|
| Homepage | `/` (always present) |
| Pricing | `/pricing`, `/plans`, `/buy`, nav link text "Pricing", "Plans", "Buy" |
| About | `/about`, `/about-us`, `/company`, `/team`, nav text "About", "Company", "Team" |
| Comparison | sitemap entries matching `/vs/*`, `/versus/*`, `/alternatives/*`, `/compare/*`. List **all** found and audit up to 3. |
| Features | `/features`, `/product`, `/platform`, `/capabilities`, nav text "Features", "Product" |
| Case study | sitemap entries under `/customers/*`, `/case-studies/*`, `/customer-stories/*`. Audit the **index** page; if no index, audit up to 3 individual case studies. |
| FAQ | `/faq`, `/faqs`, `/help`, `/support`, nav text "FAQ", "Help" |
| Agent page | `/for-ai-agents`, `/llms`, `/llms.html`, `/ai`, `/agents`, `/for-llms` |

For each URL: confirm it returns 200 with non-empty HTML before queueing a subagent. Easiest check: `node ./scripts/audit-fetch.mjs <candidate-url>` and read `status` + `bytes` from the JSON output (the result lands in `.audit-cache/`, so the subagent inherits it for free).

### Step 4 — Dispatch parallel subagents

Use the **Task tool** to dispatch one subagent per discovered surface, in parallel. Each subagent prompt is fully self-contained: target URL, full text of `./buyer-context.md`, full surface-specific instructions, and the output path.

**Critical:** Do not tell subagents to "invoke the homepage-audit skill". Subagents may not have the skill installed. Instead, paste the full surface-specific instructions and rubric into the prompt. The skill files in this repo are the canonical *source* — but at orchestration time you re-state what's needed.

Subagent prompts follow this template:

```
You are auditing a single page for AI/LLM readability. Apply the rubric and write a report to <OUTPUT_PATH>.

# Target
URL: <URL>
Surface type: <homepage|pricing|about|comparison|features|case-study|faq|agent-page>

# Buyer Context (anchor document)

<ENTIRE PASTED TEXT OF ./buyer-context.md>

# Surface-Specific Weights and Checks

<INLINE SURFACE-SPECIFIC SECTION — see appendix below for each>

# Universal Rubric

Six dimensions, each scored 1-10:

1. Extractability — plain-text clarity of offer/claim. Is hero/value-prop in HTML or locked in JS/canvas/video?
2. Schema & Structured Data — JSON-LD: Organization, Product, Offer, FAQPage, Article. Validate.
3. Buyer-Context Alignment — does page communicate the ICP/JTBD/USP/proof from the anchor above?
4. Trust & Citation-Worthiness — named, dated, sourced proof. Customer names, audit reports, leadership bios.
5. Agent-Actionability — can an agent take next step? Direct deep-links, machine-readable pricing, public APIs.
6. Crawler Accessibility — robots.txt allows AI bots, no anti-bot challenge.

Apply the surface-specific weight vector above. Compute composite = sum(score * weight) / sum(weights).

# Output Format

Write to <OUTPUT_PATH> with:
- Title + timestamp + buyer-context status
- Composite score table
- Top 3 issues ranked by impact x ease
- Per-dimension detailed findings (what's working, what's broken, specific fixes)
- Recommended next steps

# Tools available
- Bash — run `node ./scripts/audit-fetch.mjs <url>` to fetch the page. Returns JSON with `status`, `title`, `description`, `canonical`, `openGraph`, `twitter`, `jsonLd[]` (parsed; `valid: true|false` per block), `jsonLdTypes[]`, `headings`, `antiBotSignals[]`, `visibleText` (5 KB snippet), and `cachePath` for the full HTML.
- Read — read `cachePath` if you need the raw HTML or the complete visible text.
- Write — write the report to <OUTPUT_PATH>.

Note: `./scripts/audit-fetch.mjs` is shipped inside this orchestrator's skill folder and inside every per-surface skill folder. Subagents invoked by the Task tool should use a relative path that resolves under the orchestrator's CWD.

Begin.
```

**Surface-specific sections to inline** (the orchestrator stores these as snippets and substitutes the right one per dispatch):

- **homepage:** weights `[2,2,3,2,1,1]`; check above-the-fold extractability, hero alignment, top 3 proof points
- **pricing:** weights `[2,3,2,1,3,1]`; check Offer schema per tier, machine-readable plans, free-trial signals
- **about:** weights `[2,3,2,3,1,1]`; check Organization + Person schema, founding-story extractability
- **comparison:** weights `[2,2,2,3,1,1]`; check competitor-name accuracy, factual claim sourcing, comparison-table structure
- **features:** weights `[2,2,3,2,2,1]`; check feature→JTBD mapping, screenshot alt-text, integration extractability
- **case-study:** weights `[2,2,2,4,1,1]`; check named customer + named contact + quantified outcome + dated
- **faq:** weights `[2,4,2,1,1,2]`; check FAQPage schema, atomic Q&A pairs, buyer-question coverage
- **agent-page:** weights `[3,3,2,1,3,2]`; check JSON-LD breadth, contact endpoints, public API references

These snippets are derived from the per-surface SKILL.md files in this collection, condensed to ~30 lines each so the subagent prompt stays focused.

### Step 5 — Wait for subagents

Per `dispatching-parallel-agents`, run all subagents concurrently in a single Task batch. Receive each summary; verify each report file was written.

### Step 6 — Read all reports

Read every report file just written to `./reports/`:
- `crawler-audit.md`
- `homepage-audit.md`
- `pricing-audit.md`
- `about-audit.md`
- `comparison-audit.md` (if any /vs/ pages found)
- `features-audit.md`
- `case-study-audit.md`
- `faq-audit.md`
- `agent-page.md` (if page found; otherwise note absent)

### Step 7 — Synthesize

Write `./reports/full-audit-report.md` with:

1. **Headline verdict** — one line: composite score across surfaces + the single most consequential finding.
2. **Composite scoreboard** — one row per audited surface with composite score and 1-line summary.
3. **Top 10 cross-surface fixes** — ranked by impact × ease across all surfaces. Pull from each report's "Top 3 issues" but de-dup and merge (e.g. if 4 surfaces all flag "no Organization schema", that's one site-wide fix).
4. **What's missing** — surfaces that don't exist on the site at all (no /for-ai-agents, no /vs/ pages, no llms.txt, no FAQPage schema anywhere). Each = an opportunity.
5. **Per-surface composite scores** — the weighted aggregate at the site level (sum of all weighted scores / sum of all weights, treating each surface as a partition).
6. **Recommended sequence** — what to fix first, second, third based on the impact × ease ranking.

## Output Format (full-audit-report.md)

```markdown
# Full Audit Report — example.com
*Generated 2026-05-07. Buyer context: loaded. 8 surfaces audited.*

## Headline Verdict
**Site-wide AI-readability composite: 6.2/10.** Strongest on Trust & Citation-Worthiness (named, dated case studies). Weakest on Schema & Structured Data — across 6 of 8 surfaces, JSON-LD is sparse or missing.

## Composite Scoreboard

| Surface | URL | Composite | One-line |
|---------|-----|-----------|----------|
| Crawler accessibility | (infra) | 7.1/10 | GPTBot/ClaudeBot allowed; no llms.txt |
| Homepage | / | 6.4/10 | Hero doesn't name the ICP |
| Pricing | /pricing | 5.9/10 | No Offer schema on any tier |
| About | /about | 6.3/10 | Strong proof; sparse Organization schema |
| Comparison | /vs/zenith | 5.5/10 | 4 of 12 claims unsourced |
| Features | /features | 6.1/10 | 3 features lack JTBD framing |
| Case studies | /customers/zenith-labs | 7.3/10 | Citation-worthy; missing Article schema |
| FAQ | /faq | 5.4/10 | No FAQPage schema |
| Agent page | (not found) | — | **Missing entirely**; build with /agent-page |

## Site-Wide Composite: 6.2 / 10

(Weighted aggregate across all surfaces.)

## Top 10 Cross-Surface Fixes

1. **Add `FAQPage` JSON-LD to /faq.** — H impact (Google AI Overviews ingestion) — S effort. From: faq-audit.
2. **Build a `/for-ai-agents` page + publish `/llms.txt`.** — H impact — M effort. Run `/agent-page` to generate.
3. **Add `Organization` JSON-LD with founders, address, sameAs to /about.** — H impact (cross-surface trust) — M effort. From: about-audit.
4. **Add `Offer` JSON-LD to each pricing tier.** — H impact — M effort. From: pricing-audit.
5. **Rewrite homepage hero to name the ICP segment.** — H impact (sets alignment baseline for entire site) — S effort. From: homepage-audit.
6. **Source or remove unverifiable competitor claims on /vs/zenith.** — M impact (LLMs discount unsourced) — M effort. From: comparison-audit.
7. **Add `Article` schema with `datePublished` to all case studies.** — M impact — S effort. From: case-study-audit.
8. **Replace generic alt text on feature-page screenshots.** — M impact — S effort. From: features-audit.
9. **Decide intent on PerplexityBot / CCBot / Bytespider blocks; document or unblock.** — M impact — S effort. From: crawler-audit.
10. **Convert FAQ heading-style entries to questions.** — L impact — S effort. From: faq-audit.

## What's Missing

- ❌ **No `/for-ai-agents` page.** Run `/agent-page` to generate one.
- ❌ **No `llms.txt` at site root.** Generate alongside the agent page.
- ❌ **No `FAQPage` schema anywhere.** /faq is the obvious place to add it.
- ⚠️ Only one /vs/ page (`/vs/zenith`). Consider adding /vs/competitor-2 if the buyer commonly compares.

## Recommended Fix Sequence

**This week** (S effort, H impact):
1. Add `FAQPage` JSON-LD (#1)
2. Rewrite homepage hero (#5)
3. Add `Article` schema to case studies (#7)

**Next week** (M effort, H impact):
4. Build /for-ai-agents page + llms.txt (#2)
5. Expand `Organization` schema on /about (#3)
6. Add `Offer` schema on /pricing (#4)

**Within the month:**
7-10. Remaining fixes.

## Re-Audit Cadence
Run `/full-audit` again after this batch lands to measure the lift. Target: site-wide composite > 7.5.
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Running without `./buyer-context.md` | Don't refuse — auto-bootstrap via `AskUserQuestion` (Step 1). The default option chains in `/buyer-context` so the user gets the anchor without restarting the flow. Only fall through to no-anchor mode if the user explicitly opts out. |
| Telling subagents to "invoke the homepage-audit skill" | They may not have it installed; paste the full instructions + rubric into the prompt |
| Running surfaces sequentially instead of in parallel | Use Task tool's parallel-dispatch pattern; 7 surfaces in parallel ≈ 1 surface's wall time |
| Synthesizing without de-duping | If 4 surfaces flag the same site-wide issue, count it once at high priority |
| Including `crawler-audit.md` in the parallel batch | Run it first, sequentially — its output (sitemap + bot rules) informs URL discovery |
| Forgetting to note absent surfaces | A missing /vs/ page or /for-ai-agents is a finding, not a non-finding |
| Letting subagent prompts inherit conversation context | They must be standalone — paste, don't reference |

## Reference

This skill orchestrates per-surface audits whose canonical definitions live in:
- `homepage-audit/SKILL.md`
- `pricing-audit/SKILL.md`
- `about-audit/SKILL.md`
- `comparison-audit/SKILL.md`
- `features-audit/SKILL.md`
- `case-study-audit/SKILL.md`
- `faq-audit/SKILL.md`
- `agent-page/SKILL.md`
- `crawler-audit/SKILL.md`
- `buyer-context/SKILL.md`

The orchestrator does **not** require these skills to be installed in subagent contexts — it inlines what each subagent needs.
