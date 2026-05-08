---
name: homepage-audit
description: Use when the user wants to audit a homepage or landing page for AI/LLM readability, when they ask "audit my homepage", "is my landing page LLM-friendly", or provide a root-level URL (https://example.com or example.com without a deeper path) and want feedback on how AI agents and language models will read it. Scores extractability, schema, alignment with the buyer-context anchor, trust signals, agent-actionability, and crawler accessibility for the homepage specifically.
---

# homepage-audit

## Overview

Audits a homepage for AI/LLM readability. The homepage is where an agent forms its first model of the company; this audit checks whether that first impression communicates *who you are*, *who you're for*, and *what to do next* in a way an LLM can quote with confidence.

**Core principle:** The homepage's job is to answer four questions in plain text within the first viewport: *what is this, who is it for, why should I trust it, what's the next action?* If an agent can't extract those four answers from the HTML, the page fails.

## Inputs

- A homepage URL (root or "/" path).
- Optional: `./buyer-context.md` for alignment scoring. If absent, the audit runs in **no-anchor mode** — Buyer-Context Alignment is scored at low confidence and flagged in the report header.

## Output

`./reports/homepage-audit.md`

## The Rubric (surface-specific weights)

This skill uses the universal 6-dimension rubric from `references/audit-engine.md`. Homepage weight vector:

| Dim | Score 1–10 | Weight |
|-----|-----------|--------|
| Extractability | | **2** |
| Schema & Structured Data | | **2** |
| Buyer-Context Alignment | | **3** ← weighted highest |
| Trust & Citation-Worthiness | | **2** |
| Agent-Actionability | | **1** |
| Crawler Accessibility | | **1** |

**Sum:** 11. Composite = (sum of weighted scores) / 11.

## Surface-Specific Checks

Beyond the universal rubric, homepage-audit checks:

### Above-the-fold extractability test
The first viewport (~600–800px tall) must contain in **plain HTML text**:
1. The brand name
2. A one-sentence value proposition (what + for whom)
3. A primary CTA with action-oriented copy
4. At least one trust signal (named customer logo, count, or proof point)

If any of these is in an image, video, animation, or JS-rendered component, dock points on Extractability.

### Hero headline alignment
Compare the H1 / hero headline text against `buyer-context.md`:
- Does it name the ICP segment (industry, role, or company size)?
- Does it use vocabulary from the buyer-context "Use" list and avoid the "Avoid" list?
- Does it state the differentiating claim from buyer-context?

A generic "platform for everything" headline = low alignment.

### Top-3 proof points
Within the first scroll, identify 3 proof points. For each:
- Is it specific (named customer, quantified result) vs. generic ("trusted by leading brands")?
- Is it dated or recent?
- Is it linked to a deeper artifact (case study, audit report)?

### Schema priorities for homepage
- `Organization` (required) — with `name`, `url`, `logo`, `sameAs` (links to LinkedIn/Twitter/GitHub)
- `WebSite` (required) — with optional `potentialAction` for site search
- `BreadcrumbList` (optional but valuable)
- If the page mentions a primary product: `SoftwareApplication`, `Service`, or `Product` schema

## Tools

`node ./scripts/audit-fetch.mjs <url>` (via Bash) — fetches fresh and returns JSON with `status`, `title`, `description`, `canonical`, `openGraph`, `twitter`, `jsonLd[]` (parsed; each block has `valid: true|false`), `jsonLdTypes[]`, `headings`, `antiBotSignals[]`, `visibleText` (5 KB snippet; full payload at `payloadPath`, written to `./reports/fetch_<sha1>.json` and overwritten on every run). First run idempotently adds `reports/` to `.gitignore`.

## Workflow

1. **Read anchor.** If `./buyer-context.md` exists, read it. Extract: brand, ICP segment, USP, top proof points, primary CTA pattern, vocabulary use/avoid lists. If absent, set `noAnchorMode = true`.

2. **Fetch the page.** Run `node ./scripts/audit-fetch.mjs <url>` and parse the JSON. Use `jsonLd[]` for schema, `openGraph`/`canonical` for head signals, `headings` for hero, `visibleText` for above-the-fold extractability. Read `payloadPath` if you need the raw HTML.

3. **Run the universal rubric** (`references/audit-engine.md`) — score each of the 6 dimensions 1–10. In no-anchor mode: score Buyer-Context Alignment at 5/10 with a clear "low-confidence — no anchor" flag.

4. **Run surface-specific checks** — above-the-fold test, hero alignment, proof points.

5. **Compute composite** using the homepage weight vector.

6. **Write the report** following the standard format.

## Output Format

```markdown
# Homepage Audit — example.com
*Generated 2026-05-07. Buyer context: ./buyer-context.md (loaded).*

## Composite Score: 6.4 / 10

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Extractability | 8 | 2 | 16 |
| Schema & Structured Data | 4 | 2 | 8 |
| Buyer-Context Alignment | 7 | 3 | 21 |
| Trust & Citation-Worthiness | 6 | 2 | 12 |
| Agent-Actionability | 5 | 1 | 5 |
| Crawler Accessibility | 9 | 1 | 9 |
| **Total** | | **11** | **71 / 110 = 6.4** |

## Headline Verdict
*One sentence summarizing the AI-readability story for this homepage.*

## Above-the-Fold Test
- ✅ Brand name extractable (in `<title>` and H1)
- ✅ Value prop in plain text (H1 + subheadline)
- ⚠️ Primary CTA copy says "Get started" — generic; buyer-context lists "Start free trial" as preferred
- ❌ No trust signal in first viewport

## Hero Headline Alignment
- Current: *"The platform for modern teams."*
- Buyer-context says: ICP = engineering managers at Series B SaaS replacing Jenkins
- ❌ Headline names neither ICP nor differentiating claim. Recommended: rewrite to surface the ICP segment.

## Top 3 Issues (impact × ease)
1. **Hero headline doesn't name the ICP.** — *Fix:* Rewrite to mention "engineering teams" and the Jenkins-replacement angle. — *Impact:* H — *Effort:* S
2. **No JSON-LD on homepage.** — *Fix:* Add `Organization` + `WebSite` schema in the `<head>`. — *Impact:* M — *Effort:* S
3. **First viewport has no proof.** — *Fix:* Move customer logo strip above the fold, or add a one-line stat ("Trusted by 800 engineering teams"). — *Impact:* M — *Effort:* S

## Detailed Findings

### Extractability — 8/10
**What's working:** H1 and subheadline are server-rendered text. CTA copy is in HTML.
**What's broken:** Animated metric counters in the social proof strip (e.g. "10,000+ deploys/day") render as `<span data-target="10000">0</span>` — agents see "0".
**Specific fixes:** Server-render the final value. Use the animation only as visual progressive enhancement.

### Schema & Structured Data — 4/10
[per-dimension details...]

### Buyer-Context Alignment — 7/10
**What's working:** Page mentions "engineering teams" and "CI/CD" — both in buyer-context vocabulary.
**What's broken:** Doesn't name the Jenkins-replacement angle, which buyer-context flags as the core differentiating claim.
**Specific fixes:** Add a sub-headline or banner: "The Jenkins replacement engineering teams ship without DevOps."

### Trust & Citation-Worthiness — 6/10
[...]

### Agent-Actionability — 5/10
[...]

### Crawler Accessibility — 9/10
*Note: Crawler-audit covers this in depth; reported here only for completeness.*

## Recommended Next Steps
1. Hero headline rewrite (largest single lever).
2. Add `Organization` + `WebSite` JSON-LD.
3. Move proof above the fold.
4. Run `/pricing-audit example.com/pricing` next — pricing alignment compounds with homepage alignment.
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Scoring without reading buyer-context.md | Read it first; alignment is weighted highest on this surface |
| Claiming high alignment when the headline is generic | A homepage that "could describe anyone" is low alignment regardless of how polished the copy is |
| Counting OpenGraph tags as JSON-LD | They aren't — agents weight JSON-LD higher; OG is for social previews |
| Skipping the above-the-fold test | The first viewport is what determines an agent's first model |
| Writing the report under the homepage URL path (e.g. `./reports/example.com/homepage.md`) | Always `./reports/homepage-audit.md` — flat |

## When NOT to Use This Skill

- The URL is a deeper page (`/pricing`, `/about`, `/blog/...`) → use the matching surface skill instead.
- The user wants to audit infrastructure (robots.txt, sitemap) → use `crawler-audit`.
- The user wants to audit *all* surfaces → use `full-audit` (which dispatches this skill as a subagent).

## Reference

- `references/audit-engine.md` — full rubric definitions and scoring criteria for all 6 dimensions.
