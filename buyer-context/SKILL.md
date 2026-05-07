---
name: buyer-context
description: Use when the user wants to define, generate, or update their buyer/ICP/positioning context document for AI-readability audits, when starting a buyer-context workflow on a new site, when another audit reports "no buyer-context.md found" and prompts to create one, or when the user mentions ICP, positioning, JTBD, or buyer persona for an LLM-readability audit. Produces ./buyer-context.md, the anchor document every other audit in this collection reads.
---

# buyer-context

## Overview

Captures the user's brand, ICP, positioning, JTBD, proof points, and primary CTA into `./buyer-context.md` — the **anchor document** every audit in this collection (`crawler-audit`, `homepage-audit`, `pricing-audit`, etc.) reads to score Buyer-Context Alignment.

Without this document, audits run in "no-anchor mode" and give generic feedback. With it, audits become matchmaking: does the page match the buyer the user actually wants to win?

**Core principle:** Specific positioning beats generic positioning. The job of this skill is to extract the *specific* claims the user wants to win on, so audits can check whether each page makes those claims clearly to an LLM.

## Inputs

- The user's primary site URL (required).
- Their willingness to answer ~15 questions across 3 batches (~3–5 min total).

## Output

`./buyer-context.md` in the current working directory, conforming to the canonical schema in `references/buyer-context.spec.md`.

This file is **not** under `reports/` because it's an input to other skills, not an audit output.

## Workflow

### Step 1 — Check for existing file

```
if ./buyer-context.md exists:
    read it
    ask user: update specific sections, or replace entirely?
    if update: walk section-by-section with AskUserQuestion (keep/edit/skip)
    if replace: continue to Step 2
else:
    continue to Step 2
```

### Step 2 — Pre-fill from the user's site

Ask the user for their site URL if not already given. Then `WebFetch` it and extract:

- Brand name (from `<title>`, `og:site_name`, or first `<h1>`)
- Current tagline (from H1 or first paragraph of hero)
- Visible product names
- Existing primary CTA copy (the most prominent button)
- Apparent category (from meta description or H1 noun phrase)

These become **defaults** the user can confirm or override — saves typing.

### Step 3 — Batched Q&A

Run three `AskUserQuestion` calls plus interleaved free-text prompts. Don't ask all 15 at once.

#### Batch 1 — Brand & ICP

`AskUserQuestion` with these questions in one call:

1. **Segment?** B2B / B2C / B2B2C
2. **Sales motion?** PLG / Sales-led / Hybrid / Self-serve
3. **Company size of buyer?** Solo / SMB / Mid-market / Enterprise / Mixed
4. **Primary CTA pattern?** Start free trial / Book demo / Sign up with email / Contact sales

Then free-text:
- Industry/vertical focus
- Buyer titles (and user titles if they differ)
- Anti-ICP (who this is *not* for) — equally important to scope ICP

#### Batch 2 — JTBD & Positioning (free-text)

Ask in a single message, let the user answer in one block:
1. **Primary JTBD** in the form: *"When I'm <situation>, I want to <motivation>, so I can <outcome>."*
2. **Trigger event** — what just happened that made the buyer start looking?
3. **Current alternative** — what they do today instead
4. **One-sentence pitch** — what the user would say at a dinner party
5. **Core differentiating claim** — the *one* fact that makes the choice obvious if true

#### Batch 3 — Proof, Vocabulary, Failure Modes (free-text)

1. **3–5 cite-able proof points** — specific, dated, sourced. The kind of fact an LLM should be able to quote with confidence.
2. **Must-win verticals** — 1–3 segments that matter most this quarter.
3. **Vocabulary** — words to use, words to avoid.
4. **Failure modes of incumbents** — the top 3 things broken about the obvious alternative.

### Step 4 — Write the file

Write `./buyer-context.md` using the canonical structure from `references/buyer-context.spec.md`. Always include the `*Last updated: <today>*` line. Always include section headings exactly as in the spec — audits grep for them.

### Step 5 — Confirm + suggest next step

Show the user the resulting file path and a one-line summary. Then suggest:

> "Anchor doc written to `./buyer-context.md`. Next: run `/crawler-audit example.com` to check AI bot accessibility, or `/full-audit example.com` to audit the whole site."

## Schema Reference

See `references/buyer-context.spec.md` for the exact section structure, heading names, and field semantics. Headings are stable — audit skills grep for them — so do not rename or reorder.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Skipping pre-fill from site → user has to type brand name they already wrote on their homepage | Always `WebFetch` first; offer extracted defaults |
| Asking all 15 questions in one wall-of-text | Use 3 batches as defined; let the user breathe |
| Accepting generic answers ("for everyone") | Push back: "Who's the *first* user — the one whose pain you solve most acutely?" |
| Letting USP be a feature list | A USP is *one* differentiator, not five |
| Forgetting `*Last updated:*` line | Audits use it to detect staleness |
| Writing under `./reports/` | This is an input doc, not a report — write to `./buyer-context.md` at the cwd root |

## When to Re-Run

Re-run when:
- The product positioning materially shifts (new ICP, new tagline)
- A quarter passes (proof points get stale)
- Audits flag low Buyer-Context Alignment scores across multiple surfaces — that often means the anchor itself drifted from the site

## Reference

- `references/buyer-context.spec.md` — full schema with field definitions and examples.
