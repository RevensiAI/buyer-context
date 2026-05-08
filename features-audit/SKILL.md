---
name: features-audit
description: Use when the user wants to audit a feature page, product page, or capabilities page for AI/LLM readability. Triggers on URLs containing /features, /product, /platform, /capabilities, /<single-feature-name>, /integrations, or "what we do" pages. Also when user asks "audit my features page", "is my product page LLM-readable", or wants AI-readability feedback on a page describing what the product does. Scores feature-to-JTBD mapping, screenshot alt-text, integration extractability, and SoftwareApplication/Service schema.
---

# features-audit

## Overview

Audits a feature / product / capabilities page for AI/LLM readability. Feature pages are where an agent learns *what the product does*. The audit checks whether each capability is named in plain text, mapped to a buyer's job-to-be-done, and reinforced with screenshots that have meaningful alt text and `SoftwareApplication`/`Service` schema.

**Core principle:** A feature page should make an LLM say "I know what this does and which buyer it serves" within one read. Listing features without context = noise. Mapping each feature to a JTBD = signal.

## Inputs

- A feature page URL.
- Optional: `./buyer-context.md` for JTBD alignment.

## Output

`./reports/features-audit.md`

## The Rubric (surface-specific weights)

| Dim | Score 1–10 | Weight |
|-----|-----------|--------|
| Extractability | | **2** |
| Schema & Structured Data | | **2** |
| Buyer-Context Alignment | | **3** ← weighted highest |
| Trust & Citation-Worthiness | | **2** |
| Agent-Actionability | | **2** |
| Crawler Accessibility | | **1** |

**Sum:** 12.

## Surface-Specific Checks

### Feature → JTBD mapping

For every named feature on the page, can you answer: *what job does this do, for whom?* The strongest feature pages structure each feature as:

> **Feature name** → **What it does** → **Who it's for / what they get**

If the page lists "Webhooks", "API", "SSO" as bullets without context, alignment is low. If each is paired with a JTBD ("Webhooks → integrate Acme with your existing alerting → for SREs who own incident response"), alignment is high.

Compare the feature list to the JTBD and "must-win verticals" in `buyer-context.md`. Highlight features that map to the buyer-context JTBDs and flag those that don't.

### Screenshot alt-text quality

Screenshots are typically `<img>` elements. Each should have:
- `alt` attribute with a meaningful description (not "screenshot.png" or empty)
- `alt` text that describes the *content* shown, not just the UI ("dashboard showing build queue with 3 pending jobs" vs "dashboard")
- Optional: `<figcaption>` providing context
- Optional: `loading="lazy"` for performance

Empty/decorative alt = `alt=""` (correct for purely decorative images, but rare on a feature page).

### Integration list extractability

Most feature pages have an "integrations" or "works with" section. Check:
- Is the list rendered server-side (not lazy-loaded JS)?
- Each integration: named in plain text + linked to its detail page or to the partner's site
- Logos have alt text with the partner name
- Optionally: `Service` or `Product` schema referencing the integrations

### Schema priorities

- `SoftwareApplication` (if it's a software product) with `applicationCategory`, `operatingSystem`, `offers`
- `Service` (if it's a service offering) with `serviceType`, `provider`, `areaServed`
- `Product` schema with nested feature list (`hasFeature` or in `description`)
- `BreadcrumbList`
- `HowTo` blocks for any "how it works" sections

### Demos / videos

If the page has product videos:
- Is there a `VideoObject` schema with `thumbnailUrl`, `description`, `transcript`?
- Is there a written transcript or summary in HTML?
- Is the video the *only* explanation, or supplementary?

A video as the only explanation = invisible to most LLMs.

## Tools

`node ./scripts/audit-fetch.mjs <url>` (via Bash) — caches to `.audit-cache/` and returns JSON with `status`, `title`, `description`, `canonical`, `openGraph`, `twitter`, `jsonLd[]` (parsed; each block has `valid: true|false`), `jsonLdTypes[]`, `headings`, `antiBotSignals[]`, `visibleText` (5 KB snippet; full HTML payload at `cachePath`).

## Workflow

1. Read `./buyer-context.md` if present.
2. Run `node ./scripts/audit-fetch.mjs <url>` via Bash. Use `jsonLd[]` for any `Service`/`SoftwareApplication` blocks, `headings` and `visibleText` for the feature list. Read `cachePath` to inspect screenshot `<img alt>` attributes when needed.
3. Enumerate features named on the page.
4. For each feature, attempt to extract: name, what-it-does, who-it's-for, screenshot alt, schema markup.
5. Apply the universal rubric with features weights.
6. Map features against buyer-context JTBDs; note coverage gaps.
7. Compute composite, write report.

## Output Format

```markdown
# Features Audit — example.com/features
*Generated 2026-05-07. Buyer context: loaded.*

## Composite Score: 6.0 / 10

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Extractability | 7 | 2 | 14 |
| Schema & Structured Data | 4 | 2 | 8 |
| Buyer-Context Alignment | 6 | 3 | 18 |
| Trust & Citation-Worthiness | 6 | 2 | 12 |
| Agent-Actionability | 6 | 2 | 12 |
| Crawler Accessibility | 9 | 1 | 9 |
| **Total** | | **12** | **73 / 120 = 6.1** |

## Features Extracted (7)

| Feature | What it does (plain text?) | Who it's for | Screenshot alt | Maps to BC JTBD? |
|---------|---------------------------|--------------|----------------|------------------|
| Pipeline DAG | Build dependencies as a graph | engineering teams | ✅ "DAG with 14 build steps and parallel branches" | ✅ "ship without DevOps" |
| SSO | Single sign-on for SAML/OIDC | enterprise admins | ❌ alt="sso-screenshot.png" | ⚠️ partial |
| Webhooks | (no description) | (not stated) | empty alt | ❌ |
| Audit log | Compliance trail of actions | enterprise / SOC 2 | ✅ | ✅ |
| ... | ... | ... | ... | ... |

**Coverage:** 4 of 7 features map to a buyer-context JTBD. 3 features are listed without JTBD framing — they read as a feature dump, not a story.

## Top 3 Issues
1. **3 features lack any "what + who" framing.** — *Fix:* Rewrite Webhooks, Custom-actions, and Mobile-CI sections as "Feature → does X → for buyer Y". — *Impact:* H — *Effort:* M
2. **Generic alt text on 4 of 9 screenshots.** — *Fix:* Replace `alt="screenshot.png"` with a sentence describing what the screenshot shows. — *Impact:* M — *Effort:* S
3. **No `SoftwareApplication` schema.** — *Fix:* Add JSON-LD `SoftwareApplication` with `applicationCategory: "DeveloperApplication"`, link to pricing offers. — *Impact:* M — *Effort:* M

## Detailed Findings

### Buyer-Context Alignment — 6/10
**What's working:** Pipeline DAG and Audit log sections explicitly name engineering teams and compliance buyers — both in buyer-context ICP.
**What's broken:** Page is 7 features long but the buyer-context JTBD ("ship without DevOps") is only stated implicitly. The page reads like an inventory rather than a story aligned to one buyer.
**Specific fixes:** Add an opening section explicitly stating the JTBD, then frame each feature as supporting that one job.

### Schema & Structured Data — 4/10
[...]

(...)

## Recommended Next Steps
1. Rewrite featureless features (Webhooks, Custom-actions, Mobile-CI) with JTBD framing.
2. Replace generic alt text with descriptive text on every screenshot.
3. Add `SoftwareApplication` schema.
4. Run `/case-study-audit` next — features without proof are claims; case studies turn them into evidence.
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Listing features alphabetically without grouping by JTBD | Group features by the job they enable; alphabetical order is for indexes, not landing pages |
| Counting a screenshot with `alt="dashboard"` as adequate | Alt text should describe the *content* shown, not the UI element |
| Skipping the integration list — easy to miss it loads via JS | Always check whether `/integrations` content is in the HTML response |
| Treating a product video as a substitute for written description | Most LLMs can't ingest video; transcript/summary in HTML is required |
| Adding `SoftwareApplication` schema without `applicationCategory` | The category field is what lets agents place the product in the right mental box |

## Reference

- `references/audit-engine.md` — full rubric.
