---
name: competitor-audit
description: Use when the user wants to audit a competitor's site through the same AI/LLM-readability lens as their own — to see how AI agents will perceive a competitor compared to them. Triggers when user provides a competitor URL, asks "audit my competitor", "how does my competitor look to AI", "compare my AI-readability to <competitor>", or wants a side-by-side citation-likelihood report. Generates a competitor-context document, runs the universal rubric on the competitor's homepage and pricing, and produces a side-by-side comparison.
---

# competitor-audit

## Overview

Audits a competitor's site as an LLM would see it, then produces a side-by-side comparison with the user's own site. The output answers: *if a buyer asks an LLM to compare us to this competitor, who wins on AI-readability?*

**Core principle:** Competitor positioning is meaningless without your own anchor — this skill **requires** `./buyer-context.md`. The comparison only makes sense relative to a stated ICP and USP.

## Inputs

- A competitor URL (homepage, ideally — pricing optional). If no URL is given, the skill can optionally use Brave Search via `BRAVE_API_KEY` to discover up to 3 likely competitors derived from buyer-context category.
- **Required:** `./buyer-context.md` (the user's anchor).

## Outputs

Two files:
1. `./reports/competitor-context.md` — a buyer-context-style document *for the competitor*, derived from their site. Mirrors the structure of `./buyer-context.md` but populated by parsing the competitor's homepage, about, pricing, and customers pages.
2. `./reports/competitor-audit.md` — the side-by-side AI-readability report.

## The Rubric (surface-specific weights)

competitor-audit applies the **homepage** weight vector by default:

| Dim | Score 1–10 | Weight |
|-----|-----------|--------|
| Extractability | | **2** |
| Schema & Structured Data | | **2** |
| Buyer-Context Alignment | | **3** |
| Trust & Citation-Worthiness | | **2** |
| Agent-Actionability | | **1** |
| Crawler Accessibility | | **1** |

**Sum:** 11.

For "Buyer-Context Alignment" specifically, the score reflects how well the **competitor** communicates *their own* positioning (derived from their site), not how well they match *your* buyer context.

## Workflow

1. **Refuse if no anchor.** If `./buyer-context.md` is missing, prompt the user to run `/buyer-context` first. Do not proceed.

2. **Derive competitor URL** if not given:
   - From buyer-context category, ask the user to confirm 1–3 names, OR
   - If `BRAVE_API_KEY` is set: search "{{category}} alternatives" and suggest top 3 results.

3. **Build competitor-context.** Fetch competitor's homepage, about, pricing, customers pages (best effort — skip ones that 404). Extract:
   - Brand, tagline, category, one-sentence pitch
   - Apparent ICP (segment, sales motion inferred from CTAs, vertical focus)
   - USP / differentiating claim from hero
   - Top 3 proof points (named customers, funding, dates)
   - Pricing summary
   - Anti-ICP (rare on a competitor site; often inferable from what they don't talk about)

   Write to `./reports/competitor-context.md` using the same canonical schema as `./buyer-context.md`.

4. **Score competitor's homepage** using homepage-audit's checks (extractability, schema, alignment-of-self, trust, actionability, crawl).

5. **Optionally score** the competitor's pricing and `/vs/<your-brand>` page if either exists. Store as separate sections.

6. **Side-by-side compare.** For each rubric dimension, produce: your score, competitor's score, gap, and the implication (who wins this dimension on the AI-citation level).

7. **AI-citation likelihood gap.** Synthesize: when an LLM is asked "X vs Y" or "best <category> tool", which side has stronger evidence for an LLM to cite? Identify the 1–3 dimensions where the competitor wins and explain why; same for where you win.

8. Write `./reports/competitor-audit.md`.

## Output Format

```markdown
# Competitor Audit — Acme (you) vs Zenith
*Generated 2026-05-07. Buyer context: loaded. Competitor context: ./reports/competitor-context.md.*

## Headline Verdict
**You win on:** schema completeness, named customer case studies, public pricing.
**Competitor wins on:** allied buyer vocabulary (their hero names "engineering managers" — yours doesn't), `llms.txt` published, FAQPage schema.
**Net likelihood:** if a buyer asks an LLM "compare Acme to Zenith for replacing Jenkins", **you have a slight edge** on trust signals but **lose** on the buyer-vocabulary match.

## Side-by-Side Scores

| Dimension | You (Acme) | Zenith | Δ | Who wins |
|-----------|------------|--------|----|----------|
| Extractability | 8 | 7 | +1 | You |
| Schema & Structured Data | 6 | 8 | -2 | Zenith |
| Buyer-Context Alignment | 7 | 8 | -1 | Zenith (theirs names the buyer; yours doesn't) |
| Trust & Citation-Worthiness | 8 | 5 | +3 | You |
| Agent-Actionability | 5 | 7 | -2 | Zenith |
| Crawler Accessibility | 9 | 9 | 0 | Tie |
| **Composite (homepage weights)** | **7.0** | **7.4** | **-0.4** | Zenith narrowly |

## Where Zenith Wins (and why it matters)
1. **FAQPage schema published.** Their FAQ answers appear directly in Google AI Overviews and ChatGPT search. Yours doesn't, so when a buyer asks "does X support SSO?", their page surfaces and yours doesn't. — *Closing the gap:* run `/faq-audit` on your FAQ page and add `FAQPage` JSON-LD.
2. **`llms.txt` published.** Theirs at zenith.com/llms.txt summarizes the site for LLMs in markdown — agents pull it as a primary signal. — *Closing the gap:* run `/agent-page` to generate one.
3. **Hero headline names the buyer.** Their H1: "The CI/CD platform engineering managers ship without DevOps." Yours: "The platform for modern teams." The specificity wins. — *Closing the gap:* rewrite your homepage hero to match the buyer-context ICP.

## Where You Win
1. **3 named, dated, quantified case studies** vs. Zenith's logo wall with no individual studies.
2. **Public pricing for all 4 tiers** vs. Zenith's "Contact us" Enterprise tier with no disclosed range.
3. **SOC 2 Type II + ISO 27001 audit reports public** vs. Zenith mentioning "we're SOC 2" without linking the report.

## Competitor Snapshot (from competitor-context.md)

- **Brand:** Zenith
- **Category:** CI/CD platform
- **One-line:** "The CI/CD platform engineering managers ship without DevOps."
- **ICP:** mid-market SaaS, 100–500 engineers (inferred from case studies and pricing)
- **Sales motion:** PLG with sales-led Enterprise tier (inferred from sign-up flow)
- **Pricing:** $49/seat/mo Team, $79/seat/mo Business, "contact us" Enterprise
- **Customers:** Stripe (logo only), Notion (logo only), Figma (logo only)
- **Funding:** $80M Series C from Sequoia (Sep 2024)

(See `./reports/competitor-context.md` for the full schema.)

## Top 5 Recommendations to Close the Gap
1. Rewrite homepage hero to name the ICP segment (matches buyer-context vocabulary).
2. Add `FAQPage` JSON-LD to your FAQ.
3. Publish `llms.txt` and an `/for-ai-agents` page (run `/agent-page`).
4. Add `WebSite` and `BreadcrumbList` schema to your homepage.
5. Surface your strongest named-customer case study on the homepage above the fold.

## Recommended Next Steps
1. Apply recommendations 1–5.
2. Re-run `/full-audit` after 30 days to measure the change.
3. Re-run `/competitor-audit` against Zenith quarterly — they're moving fast on AI-readability.
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Running without `./buyer-context.md` | Refuse — comparison is meaningless without an anchor |
| Auto-discovering 5+ competitors and scoring all | Limit to 3 to keep the report scannable; let the user pick |
| Reading buyer-context as the *competitor's* anchor | The competitor has their own positioning; capture it in `competitor-context.md`, don't apply yours to them |
| Treating one rubric dimension as decisive | The composite matters; small wins across dimensions add up |
| Forgetting to highlight where the user wins | Always show both sides — "where you win" guides the user toward defensible advantages |

## Reference

- `references/audit-engine.md` — full rubric.
