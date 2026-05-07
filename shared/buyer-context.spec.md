# Buyer-Context Spec

> The canonical schema for `./buyer-context.md`. Every audit reads this document to score the **Buyer-Context Alignment** dimension. Stable; changes here require updating each surface skill.

## Why this exists

Audits without an anchor produce generic feedback ("your headline could be more specific"). Audits with an anchor produce specific feedback ("your headline says 'platform for teams' but your buyer-context.md says you sell to engineering managers at Series B startups replacing Jenkins — your homepage never names that buyer"). The anchor turns the audit from advice into matchmaking.

## File location

`./buyer-context.md` (in the user's working directory). Not under `reports/` because it's an input, not an output. Created and updated by the `buyer-context` skill.

## Schema

The file is plain Markdown with the following sections, in order. Each section has a stable heading so audit skills can grep for it.

```markdown
# Buyer Context — <Brand Name>
*Last updated: <YYYY-MM-DD>*

## Brand & Product

- **Brand:** <Company name as it appears on site>
- **Primary product:** <Single-sentence what it is>
- **Site:** <https://example.com>
- **Category:** <One short noun phrase the buyer would search for, e.g. "CI/CD platform" or "AI sales coaching">
- **Tagline (current site):** <Verbatim from current homepage hero>

## ICP — Ideal Customer Profile

- **Segment:** <B2B | B2C | B2B2C>
- **Sales motion:** <PLG | sales-led | hybrid | self-serve>
- **Company size:** <e.g. "Series A–C, 50–500 employees" or "Fortune 500" or "solo founders">
- **Industry / vertical:** <e.g. "fintech and healthcare with regulatory compliance needs" or "any SaaS">
- **Geography:** <e.g. "North America + Western Europe" or "global">
- **Buyer titles:** <Roles who actually sign — e.g. "VP Engineering, Director of DevOps">
- **User titles:** <Roles who use day-to-day — may differ from buyers — e.g. "Senior Software Engineer, SRE">
- **Anti-ICP:** <Who this is NOT for — equally important to scope ICP>

## Job-to-be-Done

The buyer hires this product to do *one* primary job. State it from the buyer's perspective in their words.

- **Primary JTBD:** <"When I'm <situation>, I want to <motivation>, so I can <outcome>.">
- **Trigger event:** <What just happened that made the buyer start looking? E.g. "Build pipeline broke for the third time this quarter," "Auditor flagged us in SOC 2 prep">
- **Current alternative:** <What they do today instead. Could be a competitor, a hack, or a manual process.>
- **Switching cost:** <What makes leaving the current alternative hard?>

## Positioning

- **One-sentence pitch:** <Single sentence the user would say at a dinner party. Specific. Concrete.>
- **Unique selling proposition (USP):** <What makes this different/better than the obvious alternative? Lead with the *only* reason it's different — not the longest list.>
- **Core differentiating claim:** <The one fact that, if true, makes the choice obvious. E.g. "deploys in 30 seconds, not 30 minutes" or "the only HIPAA-compliant option in this category">
- **Why now:** <What's changed in the market that makes this product newly viable or urgent?>

## Proof Points

The 3–5 most cite-able facts about the company or product. Specific. Sourced. Dated where possible. These are what an LLM should be able to quote with confidence.

1. **<Proof 1>** — <e.g. "Reduced incident MTTR from 4 hours to 12 minutes for Acme Corp (case study, Mar 2025)">
2. **<Proof 2>** — <e.g. "SOC 2 Type II + ISO 27001 audited 2025">
3. **<Proof 3>** — <e.g. "$30M Series B led by Andreessen Horowitz, Mar 2025">

## Must-Win Verticals / Use Cases

If the company has 3+ ICP segments, name the 1–3 that matter most this quarter. Audits will weight alignment to these higher.

- <Vertical 1 + one-line "why this one">
- <Vertical 2>
- <Vertical 3>

## Distinguishing Vocabulary

Words and phrases the brand uses (or wants to own) that should appear in the page copy. And words to *avoid* (industry jargon the buyer doesn't actually use).

- **Use:** <e.g. "deployment safety net", "guardrails for AI">
- **Avoid:** <e.g. "synergy", "best-in-class", "leveraging">

## Failure Modes of Incumbents

What's broken about the obvious alternative. The audit checks whether the page surfaces these gaps.

1. <e.g. "Jenkins requires a dedicated DevOps engineer to maintain the build cluster">
2. <e.g. "Open-source competitors lack SOC 2 reports, blocking enterprise sales">
3. <e.g. "Legacy tools price per-seat, which doesn't scale for AI agents that act on user behalf">

## Primary Conversion Action

What's the *one* action this site is trying to drive? Audits will weight Agent-Actionability around this action.

- **Primary CTA:** <e.g. "Start free trial", "Book a 15-min demo", "Sign up with email">
- **Secondary CTA:** <if any>
- **Anti-CTA:** <Actions that should NOT be the primary, even if they show up — e.g. "Read the whitepaper" buried where a free trial belongs>
```

## How `buyer-context` skill captures this

The skill walks the user through the schema in **3 batches** (avoid overwhelming the user with 20 questions at once). Mix of `AskUserQuestion` (closed choices) and free-text prompts (open content).

### Batch 1 — Brand & ICP (5 questions)

- `AskUserQuestion`: Segment? (B2B / B2C / B2B2C)
- `AskUserQuestion`: Sales motion? (PLG / sales-led / hybrid / self-serve)
- `AskUserQuestion`: Company size? (solo / SMB / mid-market / enterprise / mixed)
- Free text: Industry/vertical focus
- Free text: Buyer titles (and user titles if different)
- Free text: Anti-ICP — who this is *not* for

### Batch 2 — JTBD & Positioning (5 questions)

- Free text: Primary JTBD ("When I'm X, I want to Y, so I can Z")
- Free text: Trigger event
- Free text: Current alternative
- Free text: One-sentence pitch
- Free text: Core differentiating claim

### Batch 3 — Proof, Vocabulary, CTA (5 questions)

- Free text: 3–5 most cite-able proof points
- Free text: Must-win verticals (1–3)
- Free text: Vocabulary to use vs. avoid
- Free text: Failure modes of incumbents (top 3)
- `AskUserQuestion`: Primary CTA pattern? (Start free trial / Book demo / Sign up email / Contact sales / Other)

### Pre-fill where possible

Before asking, the skill `WebFetch`-es the user's site and extracts:
- Brand name (from `<title>`, og:site_name, or H1)
- Current tagline (from H1 or first paragraph)
- Visible product names
- Existing CTA copy

Then offers these as defaults the user can confirm or override — saves the user typing.

## Update vs. replace

If `./buyer-context.md` already exists, the skill:
1. Reads it.
2. Asks the user: "Update specific sections, or replace entirely?"
3. If update: shows each section's current content and asks `AskUserQuestion` whether to keep, edit, or skip.
4. If replace: starts fresh.
