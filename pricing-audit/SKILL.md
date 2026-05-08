---
name: pricing-audit
description: Use when the user wants to audit a pricing page for AI/LLM readability, when they ask "audit my pricing page", "is my pricing AI-friendly", "can ChatGPT find my prices", or provide a URL containing /pricing, /plans, /price, or /buy. Scores whether prices, plans, contract terms, and free-trial signals are extractable in plain text and marked up with valid Offer schema so AI agents can answer "how much does this cost?" with confidence.
---

# pricing-audit

## Overview

Audits a pricing page for AI/LLM readability. Pricing is the highest-value page for an agentic buyer — when an LLM is asked "how much does X cost?", it reads this page first. The audit checks whether prices, plan names, terms, and free-trial signals are extractable as **plain text** and marked up with **`Offer` schema** so the agent can quote them with confidence.

**Core principle:** "Contact sales" pricing is invisible to AI agents. The clearer and more structured the price data, the more often this page wins comparison queries.

## Inputs

- A pricing page URL.
- Optional: `./buyer-context.md` for alignment scoring (which buyer segment do these plans target?).

## Output

`./reports/pricing-audit.md`

## The Rubric (surface-specific weights)

| Dim | Score 1–10 | Weight |
|-----|-----------|--------|
| Extractability | | **2** |
| Schema & Structured Data | | **3** ← weighted highest |
| Buyer-Context Alignment | | **2** |
| Trust & Citation-Worthiness | | **1** |
| Agent-Actionability | | **3** ← weighted highest |
| Crawler Accessibility | | **1** |

**Sum:** 12.

## Surface-Specific Checks

### Machine-readable plan/price extraction

For each pricing tier visible on the page, can an HTTP-only agent extract:
- Plan name (e.g. "Starter", "Team", "Enterprise")
- Monthly price (numeric + currency)
- Annual price (if shown)
- Per-unit dimension (per-seat, per-user, per-API-call) — if applicable
- "Most popular" / recommended plan flag
- Plan included features (as a list)

If any tier is rendered via JS, in an image, or only behind a tab the user clicks, dock Extractability.

### Offer schema validation

Pricing pages should emit `Product` + `Offer` JSON-LD. Check:
- One `Offer` per tier
- `price` (numeric) and `priceCurrency` (ISO 4217)
- `priceSpecification` with `billingDuration` (e.g. P1M for monthly, P1Y for annual)
- `eligibleQuantity` if per-seat
- `availability` (`InStock`, `LimitedAvailability`, etc.)
- `priceValidUntil` if temporary pricing
- `seller` linking back to the `Organization`

### Free-trial / try-before-buy signals

Are these explicit in plain text *and* marked up?
- "Free trial" — duration?
- "Free tier" / "Free forever" — usage limits?
- "Money-back guarantee" — duration?
- "No credit card required" signal?

### Contract length disclosure

For B2B/enterprise tiers:
- Is contract length stated (month-to-month vs annual commitment)?
- Cancellation terms?
- Discount for annual prepayment shown?

### Enterprise/Custom tier

If there's a "Contact sales" tier, that's expected. But:
- Is *anything* about it disclosed (price ranges, what triggers Enterprise, included features)?
- Is the contact mechanism clear (form, email, phone)?

## Tools

`node ./scripts/audit-fetch.mjs <url>` (via Bash) — fetches fresh and returns JSON with `status`, `title`, `description`, `canonical`, `openGraph`, `twitter`, `jsonLd[]` (parsed; each block has `valid: true|false`), `jsonLdTypes[]`, `headings`, `antiBotSignals[]`, `visibleText` (5 KB snippet; full HTML payload at `payloadPath`).

## Workflow

1. Read `./buyer-context.md` if present; otherwise no-anchor mode.
2. Run `node ./scripts/audit-fetch.mjs <url>` via Bash. Parse JSON; inspect `jsonLd[]` (look for `Product`/`Offer` per tier), `headings`, `visibleText`. Read `payloadPath` if you need raw HTML for plan-table inspection.
3. Apply the universal rubric (see `references/audit-engine.md`) with pricing weights.
4. Run surface-specific checks above.
5. For each visible plan, produce a structured table in the report.
6. Compute composite, write report.

## Output Format

```markdown
# Pricing Audit — example.com/pricing
*Generated 2026-05-07. Buyer context: loaded (target ICP: Series B SaaS, eng teams).*

## Composite Score: 5.8 / 10

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Extractability | 8 | 2 | 16 |
| Schema & Structured Data | 2 | 3 | 6 |
| Buyer-Context Alignment | 7 | 2 | 14 |
| Trust & Citation-Worthiness | 5 | 1 | 5 |
| Agent-Actionability | 7 | 3 | 21 |
| Crawler Accessibility | 9 | 1 | 9 |
| **Total** | | **12** | **71 / 120 = 5.9** |

## Plans Extracted

| Plan | Monthly | Annual | Per-seat | Free trial | Schema |
|------|---------|--------|----------|------------|--------|
| Starter | $0 | — | n/a | Free forever | ❌ no Offer |
| Team | $20/user | $192/user/yr | yes | 14 days | ❌ no Offer |
| Business | $49/user | $480/user/yr | yes | 14 days | ❌ no Offer |
| Enterprise | "Contact sales" | — | — | demo only | ❌ |

## Top 3 Issues (impact × ease)
1. **No `Offer` schema on any tier.** — *Fix:* Add JSON-LD `Product` with one `Offer` per tier including `price`, `priceCurrency`, `billingDuration`. — *Impact:* H — *Effort:* M
2. **Annual pricing only visible after toggle.** — *Fix:* Render both monthly and annual in HTML; toggle is JS-progressive enhancement. — *Impact:* M — *Effort:* S
3. **Enterprise tier has no disclosed range or trigger.** — *Fix:* Add "Starts at $X/yr" or "for teams of 50+" so agents can place users at the right tier. — *Impact:* M — *Effort:* S

## Detailed Findings
*[per-dimension breakdown]*

### Extractability — 8/10
**What's working:** Plan names, monthly prices, and feature lists are server-rendered.
**What's broken:** Annual prices only appear after a JS toggle (`.pricing-toggle--annual` class). The default-rendered HTML shows only monthly.
**Specific fixes:** Render both prices in the HTML; toggle hides one via CSS.

### Schema & Structured Data — 2/10
**What's working:** Page has `Organization` schema (inherited from site-wide).
**What's broken:** No `Product` or `Offer` schema on any tier. This is the single biggest miss on a pricing page.
**Specific fixes:** [example JSON-LD block...]
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Acme Team Plan",
  "offers": {
    "@type": "Offer",
    "price": "20",
    "priceCurrency": "USD",
    "priceSpecification": {
      "@type": "UnitPriceSpecification",
      "billingDuration": "P1M",
      "unitText": "user"
    },
    "availability": "https://schema.org/InStock"
  }
}
```

### Buyer-Context Alignment — 7/10
[...]

### Trust & Citation-Worthiness — 5/10
[...]

### Agent-Actionability — 7/10
**What's working:** Sign-up CTA on every tier is a direct link to `/signup?plan=team`.
**What's broken:** Enterprise CTA is a 12-field demo form. Agents stall.
**Specific fixes:** Offer a public Enterprise email/Calendly link as a secondary path.

### Crawler Accessibility — 9/10
[informational]

## Recommended Next Steps
1. Add `Offer` schema to every tier.
2. Render annual pricing in HTML by default.
3. Disclose Enterprise range or trigger.
4. Add "no credit card required" copy to the Starter / free tier.
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Treating "Contact sales" as a fail in itself | It's expected for Enterprise; the fail is *no disclosed range or trigger* |
| Ignoring per-seat dimensions | An agent quoting "$20/mo" when the buyer needs 50 seats = wrong answer; always extract per-unit |
| Skipping the JS-toggle test | Annual-vs-monthly toggles often hide content from agents that don't run JS |
| Counting `Product` schema without `Offer` | `Product` alone doesn't quote a price; `Offer` is what agents extract from |
| Not validating ISO 4217 currency codes | "$" without `priceCurrency: "USD"` is ambiguous internationally |

## Reference

- `references/audit-engine.md` — full rubric.
