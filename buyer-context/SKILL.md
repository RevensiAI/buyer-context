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
- ~17 click-through questions, each a single `AskUserQuestion` call with 2-4 site-derived options plus an auto-appended "Other" for custom answers (~2 min total). Near-zero typing. Several spec fields (One-sentence pitch, Industry/vertical, Failure modes of incumbents, Why now) are not asked directly — they're synthesized at write time from the user's other answers and the site evidence bundle.

## Output

`./buyer-context.md` in the current working directory, conforming to the canonical schema in `references/buyer-context.spec.md`.

This file is **not** under `reports/` because it's an input to other skills, not an audit output.

## Workflow

Six phases: detect-existing → discovery → evidence → auto-fill → Q&A → write+review. The skill front-loads inference (Steps 2-4) so every question in Step 5 has site-grounded options the user clicks rather than types.

### Step 1 — Detect existing file & route

If `./buyer-context.md` already exists:

1. Read it and parse the `*Last updated: <YYYY-MM-DD>*` line.
2. Run **Step 2 site discovery anyway** so the diff is against current site state.
3. Single `AskUserQuestion`:
   - **Refresh stale fields only** *(default)* — proceed to Step 5 but only ask the fields where (a) site evidence has measurably changed since the last update, OR (b) the file is older than 90 days AND the field is in the high-decay set: Tagline, Primary CTA, Proof points, Why now.
   - **Walk all questions** — proceed to Step 5 normally, but every question's first option is "Keep current: <existing value>".
   - **Replace from scratch** — discard the existing file and proceed as if it didn't exist.

If no file exists, proceed directly to Step 2.

### Step 2 — Site discovery (parallel script fetches)

This skill ships `./scripts/audit-fetch.mjs`. Each call fetches fresh and returns JSON with `status`, `jsonLd[]`, `openGraph`, `headings`, `visibleText` (5 KB), `payloadPath`, etc. The full payload is written to `./reports/fetch_<sha1>.json` (overwritten on every run) so you can `Read` the raw HTML on demand.

1. If site URL not yet given, ask once.
2. Run `node ./scripts/audit-fetch.mjs <homepage-url>` via Bash; parse the JSON.
3. Read `payloadPath` for the full HTML and parse `<a href>` for matches against the regex set `pricing|plans|customers|case-stud|stories|testimonials`. Take the first match per category (one for the pricing-family, one for the customers-family). If no homepage match, fall back to the literal paths `/pricing` and `/customers`.
4. **Single message containing 2 parallel Bash calls** to `node ./scripts/audit-fetch.mjs <url>` for the two discovered subpages.
5. Failure handling:
   - Homepage `visibleTextChars` < 500 → set `homepageThin = true`. Tell the user once ("Couldn't extract much from the homepage; options will be more generic."), proceed.
   - Subpage 404 → silently drop; affected fields downgrade to generic options.
   - All 3 fetches fail → fully-generic mode (every question gets a generic option list). Print a one-line warning at the top of the resulting `./buyer-context.md`.

### Step 3 — Evidence consolidation (internal pass)

Before asking any questions, scan the fetched pages and build an internal "evidence bundle". Each signal seeds personalized options for one or more questions in Step 5:

| Signal | Source | Drives |
|---|---|---|
| `brand` | `<title>`, `og:site_name`, first `<h1>` | auto-fill |
| `tagline` | hero h1, hero p, og:description | auto-fill |
| `cta_primary` | most prominent button copy | auto-fill |
| `cta_secondary` | second-most prominent button | Q17 (CTAs) |
| `category_phrase` | repeated noun phrases on `/` | auto-fill (if dominant) or Q1 |
| `sales_motion_signal` | CTA verbs: trial/sign-up→PLG; demo/contact→sales-led; both→hybrid | Q3 |
| `pricing_tiers` | tier names from /pricing | Q4 |
| `buyer_titles` | titles in testimonial bylines on /customers; tagged `[buyer]`/`[user]`/`[both]` based on context (pricing/contact = buyer; product/docs = user; testimonial bylines = both) | Q7 (single merged question; falls back to two questions if tagging confidence is low) |
| `vertical_clusters` | customer-logo alt text + /customers section headings | Q5 (drives both `Industry / vertical` and `Must-Win Verticals` from a single multi-select) |
| `proof_candidates` | number+unit patterns ("$30M", "10x"), named-customer claims, certification badges, funding mentions | Q14 |
| `vocabulary_recurring` | noun phrases ≥3 occurrences across fetched pages | Q15 |
| `competitor_names` | from /vs/ pages, comparison sections, "replace X" copy | Q10 |
| `numeric_claims` | "first to", "only X", numeric metrics in hero | Q13 (single merged "Core claim" question that also populates USP and One-sentence pitch at write time) |
| `recent_press` | "in 2025", "AI", funding announcements, blog dates | Step 6 synthesis (Why now field — not asked) |
| `migration_phrases` | "migration in minutes", "import in one click" → low cost; "deep integration", "white-glove" → high | Q11 |

If a signal is empty, the corresponding question falls back to a generic option list — never skip the question.

### Step 4 — Auto-fill silently (no questions asked)

These five fields are written directly from the evidence bundle and surface only at Step 6's review screen:

- **Brand** — from `brand`
- **Site** — the URL the user provided
- **Tagline** — verbatim from `tagline`
- **Primary CTA** — verbatim from `cta_primary`
- **Category** — from `category_phrase` *only if* a single dominant noun phrase exists (≥3 occurrences and no close runner-up). Otherwise skip auto-fill and ask as Q1.

### Step 5 — One-by-one Q&A (~17 `AskUserQuestion` calls)

**Rules for every call:**

- One question per call (`questions` array of length 1).
- Each option's `description` references the site evidence ("your CTAs say...", "your /pricing tiers are...") so the user sees *why* it's a candidate.
- 2-4 options per question — the harness auto-appends "Other"; **don't add it manually** (produces a duplicate).
- `multiSelect: false` except where noted in the table below.
- "Other" text is taken **verbatim**, only whitespace-trimmed. For multi-select list fields, accept newline- or comma-separated input. For Q13 (JTBD) specifically, if the Other text doesn't include "When I'm... I want to... so I can...", re-prompt **once** with the template inline; second response is taken as-is.
- In update-existing mode (Step 1 "Walk all"), prepend a `Keep current: <value>` option as the first option for each question.

**Question order (easiest → hardest, builds momentum):**

| # | Field(s) populated | header | Option source | Multi |
|---|---|---|---|---|
| 1 | Category *(only if not auto-filled in Step 4)* | Category | `category_phrase` candidates | no |
| 2 | Segment | Segment | logos + pricing copy | no |
| 3 | Sales motion | Sales motion | `sales_motion_signal` | no |
| 4 | Company size | Company size | `pricing_tiers` | no |
| 5 | **Must-Win Verticals** + Industry/vertical (merged) | Must-win | `vertical_clusters` — pick 1-3; the same selections populate both fields at write time | **yes** |
| 6 | Geography | Geography | footer copyright + /about | no |
| 7 | **Buyer titles + User titles** (merged) | Roles | `buyer_titles` — each option labelled with `[buyer]`, `[user]`, or `[both]`; the split happens at write time. Falls back to two separate questions (Q7a Buyer titles, Q7b User titles) if evidence is too thin to tag confidently | **yes** |
| 8 | Anti-ICP | Anti-ICP | pricing floor + heuristics | no |
| 9 | Trigger event | Trigger | "replace X"/"tired of Y" copy | no |
| 10 | Current alternative | Alternative | `competitor_names` | no |
| 11 | Switching cost | Switch cost | `migration_phrases` | no |
| 12 | Primary JTBD | JTBD | **synthesize 2-3 candidate phrasings** in "When I'm X, I want to Y, so I can Z" form from /features hero copy | no |
| 13 | **Core claim + USP + One-sentence pitch** (merged) | Claim | **synthesize 3-4 candidates** from `numeric_claims` + repeated differentiators + hero h1+p. Core claim and USP are populated verbatim from the user's pick; pitch is synthesized at write time as `"<Brand> is <Category> for <Segment> that <core claim>."` | no |
| 14 | Proof points (pick 3-5) | Proof | `proof_candidates` — present 5-6 candidates | **yes** |
| 15 | Use vocabulary (pick 3-5) | Use words | `vocabulary_recurring` top 5-7 | **yes** |
| 16 | Avoid vocabulary (pick 3-5) | Avoid words | generic overused-buzzword list (no good site signal) | **yes** |
| 17 | **Secondary CTA + Anti-CTA** (merged) | CTAs | one screen with prefixed options like `"2nd: Book demo"` and `"Anti: Read whitepaper"` from `cta_secondary` and any mis-prioritized CTAs detected. Parse the prefix at write time to split into the two fields | **yes** |

**Fields not asked (synthesized at write time):**

- **One-sentence pitch** — derived from the Q13 pick + Brand + Category + Segment.
- **Industry / vertical** — derived from the Q5 multi-select (`"primarily " + selected.join(" + ")`, or `"any"` if user picks "Other: any").
- **USP** — set verbatim from the Q13 Core claim pick.
- **Why now** — top phrase from `recent_press` evidence verbatim; if empty, the field is set to `<n/a>`.
- **Failure Modes of Incumbents** — one-line note inferred from Q10 Current alternative vs. Q13 Core claim. The section heading remains.

#### Worked example — Sales motion (Q3)

```
AskUserQuestion({
  questions: [{
    header: "Sales motion",
    question: "Your homepage shows a free tier plus a 'Talk to an expert' CTA on Enterprise. Which sales motion fits best?",
    multiSelect: false,
    options: [
      { label: "PLG",        description: "Self-serve sign-up (your free tier suggests this)" },
      { label: "Sales-led",  description: "Demo-first; rep involved in every deal" },
      { label: "Hybrid",     description: "PLG for SMB + sales-led for enterprise (matches your two-track pricing)" },
      { label: "Self-serve", description: "Pure self-serve, no human in the loop" }
    ]
  }]
})
```

#### Worked example — Synthesized JTBD (Q12)

```
AskUserQuestion({
  questions: [{
    header: "JTBD",
    question: "Pick the JTBD phrasing that best fits your buyer (drafted from your /features copy):",
    multiSelect: false,
    options: [
      { label: "Push-to-deploy",  description: "When I'm shipping a Next.js app, I want push-to-deploy so I can release without managing infra" },
      { label: "Marketing speed", description: "When my team needs a landing page live today, I want preview URLs so I can iterate fast" },
      { label: "Edge-first",      description: "When my app must respond globally, I want edge runtime so latency stays low" }
    ]
  }]
})
```

#### Worked example — Core claim (Q13, merged USP + Pitch)

```
AskUserQuestion({
  questions: [{
    header: "Claim",
    question: "Pick the core claim your buyer should remember (drives USP and pitch — synthesized from your hero + repeated differentiators):",
    multiSelect: false,
    options: [
      { label: "30s deploys",    description: "deploys in 30 seconds, not 30 minutes (your hero h1 + benchmark page)" },
      { label: "Only HIPAA",     description: "the only HIPAA-compliant option in this category (compliance page badge)" },
      { label: "10x cold start", description: "10x faster cold start than self-hosted (benchmark page hero stat)" }
    ]
  }]
})
```

At write time, the user's pick populates `Core differentiating claim` and `Unique selling proposition (USP)` verbatim, and `One-sentence pitch` is rendered as `"<Brand> is <Category> for <Segment> that <pick>."`

#### Worked example — Roles, merged with `[buyer]`/`[user]`/`[both]` tagging (Q7)

```
AskUserQuestion({
  questions: [{
    header: "Roles",
    question: "Pick the roles that matter — we'll separate buyers vs. day-to-day users at write time:",
    multiSelect: true,
    options: [
      { label: "VP Engineering [buyer]",       description: "appears in your enterprise pricing and 'Talk to sales' page" },
      { label: "Director of DevOps [buyer]",   description: "named on /customers signing the deal" },
      { label: "Senior Software Engineer [user]", description: "appears in /docs and feature copy, never in pricing" },
      { label: "SRE [both]",                   description: "testimonial bylines show SREs both signing and using the product" }
    ]
  }]
})
```

If `buyer_titles` evidence has fewer than 3 cleanly-tagged roles, fall back to two separate questions (Q7a Buyer titles, Q7b User titles) instead of this merged form.

#### Worked example — Proof points (Q14, multi-select)

```
AskUserQuestion({
  questions: [{
    header: "Proof",
    question: "Pick 3-5 proof points an LLM should be able to quote about you (surfaced from your site):",
    multiSelect: true,
    options: [
      { label: "Acme MTTR",    description: "Reduced incident MTTR 4h → 12min for Acme (case study, Mar 2025)" },
      { label: "SOC 2 + ISO",  description: "SOC 2 Type II + ISO 27001 audited 2025 (footer badge)" },
      { label: "Series B",     description: "$30M Series B led by Andreessen Horowitz, Mar 2025 (about page)" },
      { label: "100+ regions", description: "Edge network in 100+ regions globally (homepage hero stat)" },
      { label: "10x faster",   description: "10x faster cold start than self-hosted (benchmark page)" }
    ]
  }]
})
```

### Step 6 — Synthesize, write file, final review

#### 6a. Synthesize the fields that weren't asked

Before writing, derive the spec fields that aren't tied to a question. Run these in order — each is deterministic from prior answers and the evidence bundle:

| Field | Derivation |
|---|---|
| `Industry / vertical` | From the Q5 multi-select selections. If user picked specific verticals → `"primarily " + selected.join(" + ")`. If user picked "Other: any" or selected nothing → `"any"`. |
| `Buyer titles` | From the Q7 merged selections — items tagged `[buyer]` or `[both]`. If Q7 fell back to two questions, take Q7a verbatim. |
| `User titles` | From the Q7 merged selections — items tagged `[user]` or `[both]`. If Q7 fell back to two questions, take Q7b verbatim. If empty/same as buyer titles, write `"same as buyer"`. |
| `Unique selling proposition (USP)` | Verbatim from the Q13 Core claim pick. |
| `One-sentence pitch` | Template: `"<Brand> is <Category> for <Segment> that <Q13 pick>."` Trim/normalize punctuation so the result reads as one clean sentence. |
| `Why now` | Top phrase from `recent_press` evidence verbatim (e.g. `"$30M Series B led by a16z, Mar 2025"`). If `recent_press` is empty, write `<n/a>`. |
| `Failure Modes of Incumbents` | One-line note: `"Inferred: <Q10 Current alternative> typically falls short on <Q13 Core claim> — the page should make this gap explicit."` Renders as a single bullet so the section heading remains populated. |
| `Secondary CTA` | From Q17 — items prefixed `2nd:` (strip the prefix). If multiple, take the first. If none, leave empty. |
| `Anti-CTA` | From Q17 — items prefixed `Anti:` (strip the prefix). If multiple, take the first. If none, leave empty. |

#### 6b. Write `./buyer-context.md`

Use the canonical structure from `references/buyer-context.spec.md`. Always include the `*Last updated: <YYYY-MM-DD>*` line. **Section headings must match the spec exactly — downstream audits grep for them.**

#### 6c. Final-review screen

Single `AskUserQuestion` with `multiSelect: true` showing the auto-filled and synthesized values most likely to need a tweak:

   ```
   AskUserQuestion({
     questions: [{
       header: "Final review",
       question: "Anything to fix? (leave empty to confirm all)",
       multiSelect: true,
       options: [
         { label: "Brand: <value>",        description: "Auto-detected from <title>" },
         { label: "Tagline: <value>",      description: "Verbatim from hero h1" },
         { label: "Primary CTA: <value>",  description: "Most prominent button copy" },
         { label: "Category: <value>",     description: "Top noun phrase on homepage" },
         { label: "Industry: <value>",     description: "Synthesized from your must-win verticals (Q5)" },
         { label: "Pitch: <value>",        description: "Synthesized template using Brand + Category + Segment + your Q13 pick" },
         { label: "Failure modes: <value>", description: "One-line inference from your current-alternative + core-claim answers" },
         { label: "Site: <value>",         description: "URL you provided" }
       ]
     }]
   })
   ```

For each item the user selects, run a follow-up `AskUserQuestion` with two options: `Confirm: <current value>` and let auto-Other handle the override. Update the file before finalizing.

Then print:

   > "Anchor doc written to `./buyer-context.md`. Next: run `/crawler-audit` to check AI bot accessibility, or `/full-audit example.com` to audit the whole site."

## Schema Reference

See `references/buyer-context.spec.md` for the exact section structure, heading names, and field semantics. Headings are stable — audit skills grep for them — so do not rename or reorder.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Asked free-text instead of generating personalized options | Always derive options from the Step 3 evidence bundle; only fall back to generic options when fetch failed |
| Fetched only the homepage | Fetch homepage + `/pricing` + `/customers` in parallel — the personalization budget pays back across 17 questions |
| Asked multiple questions per `AskUserQuestion` call | One question per call. Closed-choice = `multiSelect: false`; the multi-select questions are Q5 (Must-win), Q7 (Roles), Q14 (Proof), Q15 (Use words), Q16 (Avoid words), Q17 (CTAs) |
| Manually appended an "Other" option | The harness auto-appends Other; adding one yourself produces a duplicate |
| Asked about Brand / Tagline / Primary CTA as standalone questions | These are auto-filled silently in Step 4 and reviewed only at Step 6 |
| Asked Pitch / USP / Industry / Failure modes / Why now as separate questions | These are not asked — they're synthesized in Step 6a from neighboring answers + the evidence bundle |
| Skipped Step 6a synthesis and left these fields blank in the file | The headings are contract; populate them with the documented derivations even when evidence is thin (use `<n/a>` only as a last resort) |
| Synthesized JTBD or Core-claim candidates were too generic | Pull verbatim phrases and metrics from /features and hero copy; vary the 2-3 candidate phrasings so the user has real choices |
| Accepted "for everyone" as the segment answer | Push back: "Who's the *first* user — the one whose pain you solve most acutely?" |
| Let the Q13 Core claim become a feature list | Core claim is *one* differentiator, not five — if every option is a feature bullet, regenerate the candidates |
| Forced the merged Roles question (Q7) when evidence was too thin to tag confidently | Fall back to two separate questions (Q7a Buyer titles, Q7b User titles); the tag-based merge only works when ≥3 roles can be cleanly bucketed |
| Forgot `*Last updated:*` line | Audits use it to detect staleness |
| Wrote under `./reports/` | This is an input doc, not a report — write to `./buyer-context.md` at the cwd root |

## When to Re-Run

Re-run when:
- The product positioning materially shifts (new ICP, new tagline)
- A quarter passes (proof points get stale)
- Audits flag low Buyer-Context Alignment scores across multiple surfaces — that often means the anchor itself drifted from the site

## Reference

- `references/buyer-context.spec.md` — full schema with field definitions and examples.
