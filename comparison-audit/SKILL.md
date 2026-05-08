---
name: comparison-audit
description: Use when the user wants to audit a /vs/ or comparison page — pages where their product is compared to a named competitor. Triggers on URLs containing /vs/, /versus/, /alternatives/, /comparison/, /compare/, or "X vs Y" patterns. Also when user asks "audit my comparison page", "is my /vs/ page LLM-friendly", or wants to evaluate how AI agents will read claims their site makes about competitors. Scores factual accuracy, dated comparisons, fair representation, and structured-data markup of comparison tables.
---

# comparison-audit

## Overview

Audits a `/vs/` or alternatives comparison page for AI/LLM readability. Comparison pages are high-stakes for AI consumption: an agent answering "should I pick A or B?" will weight a structured, fair, dated comparison page heavily — and *will* discount or contradict a page that misrepresents the competitor.

**Core principle:** A comparison page that an LLM trusts is one where the competitor would also nod along. Specificity, dates, and structured tables beat marketing-speak.

## Inputs

- A comparison page URL (typical patterns: `/vs/`, `/versus/`, `/alternatives/`, `/compare/`, `/<your-product>-vs-<competitor>/`).
- Optional: `./buyer-context.md` for alignment.

## Output

`./reports/comparison-audit.md`

## The Rubric (surface-specific weights)

| Dim | Score 1–10 | Weight |
|-----|-----------|--------|
| Extractability | | **2** |
| Schema & Structured Data | | **2** |
| Buyer-Context Alignment | | **2** |
| Trust & Citation-Worthiness | | **3** ← weighted highest |
| Agent-Actionability | | **1** |
| Crawler Accessibility | | **1** |

**Sum:** 11.

## Surface-Specific Checks

### Competitor name accuracy

Is the competitor named explicitly in:
- Page `<title>` and H1?
- Body copy?
- URL slug (e.g. `/acme-vs-zenith`)?
- Meta description?

If the competitor is referred to obliquely ("our biggest competitor", "the legacy alternative"), agents can't match the page to a buyer query like "Acme vs Zenith".

### Factual accuracy of competitor claims

Read every claim made about the competitor. For each:
- Is it sourced (link to competitor's docs, pricing page, status page)?
- Is it dated (when was this true)?
- Is it specific (numeric, named feature) vs. vague ("slow", "complex")?
- Is it falsifiable (could the competitor refute it with evidence)?

Unsourced, undated, vague claims are weak proof. They reduce both Trust and Buyer-Context Alignment scores because LLMs are trained to discount unverifiable claims.

### Comparison table structure

A comparison table should be:
- An actual `<table>` element (not a flexbox grid of divs)
- Have `<th>` headers identifying each column (your product, competitor)
- Have `<th scope="row">` for row labels (each feature/dimension)
- Ideally marked up with structured data — see "Schema priorities" below

### Dated / version-specific comparison

When was this comparison written? When was it last updated? Comparisons go stale fast (competitors ship features). The page should:
- State an "as of <date>" timestamp visible in HTML
- Have a `datePublished` and `dateModified` in JSON-LD `Article` schema
- Note the competitor's version or release date if relevant

### Schema priorities

- `Article` JSON-LD with `datePublished`, `dateModified`, `author`
- For each product compared: nested `Product` schema
- Optionally `Review` schema (the page is reviewing the competitor)
- `BreadcrumbList` for navigation

### Fair representation check

Even if the page is your own (it should favor you), an LLM-readable comparison still:
- Acknowledges 1+ thing the competitor does *better* (builds trust)
- States the use cases where the competitor is the right pick
- Doesn't put feature checks against the competitor for things they actually have

Pages that look like attack ads score lower because models discount them.

## Tools

`node ./scripts/audit-fetch.mjs <url>` (via Bash) — fetches fresh and returns JSON with `status`, `title`, `description`, `canonical`, `openGraph`, `twitter`, `jsonLd[]` (parsed; each block has `valid: true|false`), `jsonLdTypes[]`, `headings`, `antiBotSignals[]`, `visibleText` (5 KB snippet; full HTML payload at `payloadPath`).

## Workflow

1. Read `./buyer-context.md` if present.
2. Identify the named competitor from URL/title/H1.
3. Run `node ./scripts/audit-fetch.mjs <url>` via Bash. Use `jsonLd[]`, `headings`, `visibleText`. Read `payloadPath` for the raw HTML when you need to inspect the comparison table structure.
4. For each claim about the competitor, classify: sourced/dated/specific vs. vague.
5. Apply the universal rubric with comparison weights.
6. Compute composite, write report.

## Output Format

```markdown
# Comparison Audit — example.com/vs/zenith
*Generated 2026-05-07. Buyer context: loaded. Competitor: Zenith.*

## Composite Score: 5.5 / 10

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Extractability | 7 | 2 | 14 |
| Schema & Structured Data | 3 | 2 | 6 |
| Buyer-Context Alignment | 6 | 2 | 12 |
| Trust & Citation-Worthiness | 5 | 3 | 15 |
| Agent-Actionability | 5 | 1 | 5 |
| Crawler Accessibility | 9 | 1 | 9 |
| **Total** | | **11** | **61 / 110 = 5.5** |

## Competitor Identification
- ✅ Named in URL: `/vs/zenith`
- ✅ Named in `<title>`: "Acme vs Zenith — which CI/CD platform is right for you?"
- ✅ Named in H1
- ✅ Named in meta description

## Comparison Claims Audit (sample — 12 claims on page)

| Claim about Zenith | Sourced? | Dated? | Specific? | Score |
|---------------------|----------|--------|-----------|-------|
| "Slow build times" | ❌ | ❌ | ❌ vague | 1/10 weak |
| "No SOC 2" | ✅ link to Zenith trust page | ⚠️ no date | ✅ | 7/10 |
| "Pricing starts at $50/mo" | ✅ link | ✅ "as of 2026-04" | ✅ | 9/10 strong |
| "Doesn't support GitHub Actions" | ❌ | ❌ | ⚠️ unverified | 3/10 — **falsifiable risk; Zenith may have shipped this** |

## Top 3 Issues
1. **4 of 12 claims are unsourced and falsifiable.** — *Fix:* Add link to competitor's docs/pricing for each claim, with "as of <date>" note. Remove or rephrase any claim you can't source. — *Impact:* H — *Effort:* M
2. **No `Article` schema with `datePublished`.** — *Fix:* Add JSON-LD `Article` with author, datePublished, dateModified. — *Impact:* M — *Effort:* S
3. **Comparison "table" is a flexbox grid of divs.** — *Fix:* Use `<table>` with proper `<th>` and scope attributes. — *Impact:* M — *Effort:* S

## Detailed Findings

### Trust & Citation-Worthiness — 5/10
**What's working:** Some claims have explicit sources (pricing, SOC 2 status).
**What's broken:** "Slow build times", "Complex setup", "Limited integrations" are presented as facts with no source. An LLM will discount the entire page if it spots even a few unverifiable claims.
**Specific fixes:** [list each claim + where to source]

### Schema & Structured Data — 3/10
[...]

(... etc ...)

## Recommended Next Steps
1. Source or remove the 4 unverifiable claims.
2. Add Article schema with dates.
3. Convert comparison divs to a real table.
4. Acknowledge 1 thing Zenith does well — paradoxically improves trust.
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Treating an attack-ad style page as "high alignment" because it slams the competitor | LLMs discount these; a fair, dated, sourced comparison wins more queries |
| Counting a flexbox "table" as a table for schema purposes | It isn't — agents need real `<table>` semantics or explicit schema |
| Skipping the date check | Comparisons go stale in a quarter; undated comparisons are low-trust |
| Not extracting the competitor name | A page about "the legacy alternative" doesn't match queries asking about specific competitors |

## Reference

- `references/audit-engine.md` — full rubric.
