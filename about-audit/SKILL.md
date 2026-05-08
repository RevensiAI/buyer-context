---
name: about-audit
description: Use when the user wants to audit an About, Team, Company, or Leadership page for AI/LLM readability, when they ask "audit my about page", "is my company page LLM-readable", or provide a URL containing /about, /team, /company, /leadership, or /people. Scores whether the company's identity, leadership, founding story, and credibility signals are extractable as plain text and marked up with Organization + Person schema so AI agents can confidently answer "who are these people and why should I trust them?"
---

# about-audit

## Overview

Audits an About / Team / Company page for AI/LLM readability. The About page is where an agent forms its model of *who is behind* the product — the founders, the funders, the headcount, the location, the founding story. The audit checks whether those facts are quotable in plain text and reinforced with `Organization` and `Person` schema.

**Core principle:** Trust at the company level is a separate signal from trust at the product level. An agent that can cite "Acme was founded 2019 by ex-Google staff engineers, raised $30M Series B from a16z in 2025" gives a different recommendation than one that can only cite "trusted by leading brands."

## Inputs

- An About / Team / Company page URL.
- Optional: `./buyer-context.md` for alignment.

## Output

`./reports/about-audit.md`

## The Rubric (surface-specific weights)

| Dim | Score 1–10 | Weight |
|-----|-----------|--------|
| Extractability | | **2** |
| Schema & Structured Data | | **3** ← weighted highest |
| Buyer-Context Alignment | | **2** |
| Trust & Citation-Worthiness | | **3** ← weighted highest |
| Agent-Actionability | | **1** |
| Crawler Accessibility | | **1** |

**Sum:** 12.

## Surface-Specific Checks

### Organization schema completeness

The About page is the canonical place to host rich `Organization` schema. Check:
- `name`, `legalName`, `alternateName`
- `url`, `logo`
- `sameAs` — array of authoritative profile URLs (LinkedIn, Crunchbase, GitHub, X/Twitter, Wikipedia)
- `address` — `PostalAddress` with `addressCountry`, `addressLocality`, optionally `streetAddress`
- `foundingDate` (ISO date)
- `founders` — array of `Person` objects
- `numberOfEmployees` — `QuantitativeValue` (range OK)
- `parentOrganization` if subsidiary
- `funder` array if VC-backed (each `Organization`)
- `description` — concise, factual

### Leadership / Person schema

Each named leader on the page should have a `Person` JSON-LD block (or be an entry inside `Organization.founders`/`Organization.employee`):
- `name`, `jobTitle`
- `image` (headshot URL)
- `sameAs` — LinkedIn, GitHub, X, personal site
- `worksFor` linking to the `Organization`
- `alumniOf` — past companies/schools (optional but cite-able)

### Founding story extractability

The narrative should be in plain HTML, not in a video without a transcript. Check:
- Founding year — explicit in text (not just "established 2019" in a logo image)
- Founding location
- Founding team — names + roles
- Origin story — 1–2 paragraphs explaining why the company exists
- Mission / vision statement — distinct from marketing copy

### Trust signals on About specifically

About pages bear extra weight for citation-worthiness:
- Audited financials disclosed? (Public companies)
- Investors named? (Private companies)
- Press coverage with names + dates?
- Awards or third-party recognition with attribution?
- Public commitments (B Corp, carbon neutral, accessibility statement)?

## Tools

`node ./scripts/audit-fetch.mjs <url>` (via Bash) — caches to `.audit-cache/` and returns JSON with `status`, `title`, `description`, `canonical`, `openGraph`, `twitter`, `jsonLd[]` (parsed; each block has `valid: true|false`), `jsonLdTypes[]`, `headings`, `antiBotSignals[]`, `visibleText` (5 KB snippet; full HTML payload at `cachePath`).

## Workflow

1. Read `./buyer-context.md` if present.
2. Run `node ./scripts/audit-fetch.mjs <url>` via Bash. Look for `Organization` and `Person` blocks in `jsonLd[]`; check `visibleText` for the founding story.
3. Apply the universal rubric with about weights.
4. Run surface-specific checks: Organization schema completeness, Person schema for each leader, founding-story extractability.
5. Compute composite, write report.

## Output Format

```markdown
# About Audit — example.com/about
*Generated 2026-05-07. Buyer context: loaded.*

## Composite Score: 6.1 / 10

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Extractability | 7 | 2 | 14 |
| Schema & Structured Data | 4 | 3 | 12 |
| Buyer-Context Alignment | 6 | 2 | 12 |
| Trust & Citation-Worthiness | 8 | 3 | 24 |
| Agent-Actionability | 5 | 1 | 5 |
| Crawler Accessibility | 9 | 1 | 9 |
| **Total** | | **12** | **76 / 120 = 6.3** |

## Organization Snapshot (extracted)

| Field | Value | Source |
|-------|-------|--------|
| Legal name | Acme Inc. | text + footer |
| Founded | 2019 | text only (not in schema) |
| HQ | San Francisco, CA | text only |
| Employees | "~120" | text only |
| Funding | $30M Series B (a16z, 2025) | text + press logos |
| Founders | 2 named (Alice Chen, Bob Patel) | text only |
| Schema | `Organization` (sparse — only name + url) | JSON-LD |

## Top 3 Issues (impact × ease)
1. **Sparse Organization schema** — only `name` and `url`. Missing `foundingDate`, `founders`, `numberOfEmployees`, `funder`, `sameAs`, `address`. — *Fix:* Add complete `Organization` JSON-LD with all fields the page already states in plain text. — *Impact:* H — *Effort:* M
2. **No Person schema for founders.** — *Fix:* Add `Person` JSON-LD for each named leader with `name`, `jobTitle`, `sameAs` (LinkedIn). — *Impact:* M — *Effort:* M
3. **Founding location only in About body, not extractable from `<address>`.** — *Fix:* Add `<address>` element with `itemprop="address"` or include in `Organization.address` schema. — *Impact:* L — *Effort:* S

## Detailed Findings

### Extractability — 7/10
[...]

### Schema & Structured Data — 4/10
[...]

### Buyer-Context Alignment — 6/10
[...]

### Trust & Citation-Worthiness — 8/10
**What's working:** Investors named (a16z), funding round dated (Mar 2025), founders named with roles, press coverage from named publications.
**What's broken:** Press logos shown but no individual citations with article URL + date.
**Specific fixes:** Replace logo wall with a "Press" section linking each article with publication, headline, and date.

### Agent-Actionability — 5/10
[...]

### Crawler Accessibility — 9/10
[informational]

## Recommended Next Steps
1. Expand Organization schema (the largest single lever on this surface).
2. Add Person schema for the leadership team.
3. Convert press logos into linked, dated citations.
4. Run `/case-study-audit` next — case studies extend the trust narrative the About page starts.
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Reading the About page in a browser and assuming agents see the same — leadership grids are often image-heavy with names in alt text only | Always check the raw HTML for plain-text names + roles |
| Counting one Person schema for the CEO and stopping there | Every named leader on the page should have Person schema |
| Ignoring `sameAs` arrays | sameAs is what lets an agent cross-reference the leader to LinkedIn/Wikipedia for confidence |
| Treating press logos as citations | Logos without URLs/dates are weak proof; a real citation has publication, headline, date, link |

## Reference

- `references/audit-engine.md` — full rubric.
