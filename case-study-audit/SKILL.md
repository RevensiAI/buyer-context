---
name: case-study-audit
description: Use when the user wants to audit a case study, customer story, success story, or customers index page for AI/LLM readability. Triggers on URLs containing /case-studies, /customers, /case-study, /stories, /success, /customer-stories, or specific customer names. Also when user asks "audit my case study", "audit my customers page", "is my case study LLM-citable", or wants AI-readability feedback on customer evidence. Scores whether the customer is named, the contact attributed, the result quantified and dated, the industry tagged, and the page marked up with Article schema so an LLM will cite it.
---

# case-study-audit

## Overview

Audits a case study or customers/customer-stories page for AI/LLM readability. Case studies are the highest-trust artifact a marketing site produces — *if* the LLM can extract the named customer, the dated outcome, and the quantified result. The audit checks whether the page meets the bar for citation.

**Core principle:** A case study an LLM will cite is one where every paragraph could be quoted with attribution. Anonymous "Fortune 500 customer", undated outcomes, and unnamed contacts all reduce citation likelihood.

## Inputs

- Either a single case study URL (audits one) or a customers index URL (audits the index page + samples representative case studies it links to).
- Optional: `./buyer-context.md` for ICP-fit scoring.

## Output

`./reports/case-study-audit.md`

## The Rubric (surface-specific weights)

| Dim | Score 1–10 | Weight |
|-----|-----------|--------|
| Extractability | | **2** |
| Schema & Structured Data | | **2** |
| Buyer-Context Alignment | | **2** |
| Trust & Citation-Worthiness | | **4** ← dominant |
| Agent-Actionability | | **1** |
| Crawler Accessibility | | **1** |

**Sum:** 12.

## Surface-Specific Checks

### Customer identity (citation-worthy basics)

For every case study, the LLM should be able to extract:
- **Customer name** — explicit, in plain text + `<title>` + meta description
- **Customer industry / vertical** — tagged or stated (fintech, healthcare, etc.)
- **Customer size** — employee count, revenue band, or named tier (Fortune 500, Series B, etc.)
- **Customer logo** — with alt text containing the company name
- **Customer URL** — link to the customer's own site (signals real, not invented)

Anonymous case studies ("a Fortune 500 financial services company") are weak proof. They protect the customer's privacy but cost the citation.

### Named contact attribution

The testimonial / quote in the case study should attribute to a named individual:
- **Name** + **Title** + **Company** in plain text
- **Photo** with descriptive alt
- Ideally: link to LinkedIn (provides verifiability)
- Ideally: `Person` schema or attribution metadata

"VP of Engineering, Acme" is OK; "VP Engineering" alone is weak.

### Quantified outcome

Every case study needs at least one quantified outcome:
- A measurable change ("reduced X by 47%", "saved 12 hours/week", "prevented 3 incidents")
- A timeframe ("in 90 days", "Q1 2026")
- A baseline ("from 4 hours to 12 minutes")
- Calculable ROI if relevant

Vague outcomes ("dramatically improved", "transformed our workflow") = weak proof.

### Date / recency

- `datePublished` in the page (visible HTML *and* JSON-LD)
- `dateModified` if updated
- The story itself should reference when the engagement happened (Q1 2026, 2024-2025, etc.)
- Old case studies (>2 years undated) reduce trust score

### Schema priorities

- **`Article`** with `headline`, `author`, `datePublished`, `about` (the customer organization)
- **`Organization`** for the customer (nested or sameAs the customer's URL)
- **`Person`** for the named contact
- **`Quotation`** for the testimonial (linking to the speaker)
- Optionally **`Review`** if the case study is structured as a review

### For customers-index pages

If auditing an index/landing page (e.g. `/customers`), check:
- Each linked case study has a logo with alt-text and a one-line teaser
- Filterable by industry / use case / size?
- Schema: `CollectionPage` listing all case studies as `Article` items
- Anchor text on each link names the customer (not "Read story")

## Tools

`node ./scripts/audit-fetch.mjs <url>` (via Bash) — fetches fresh and returns JSON with `status`, `title`, `description`, `canonical`, `openGraph`, `twitter`, `jsonLd[]` (parsed; each block has `valid: true|false`), `jsonLdTypes[]`, `headings`, `antiBotSignals[]`, `visibleText` (5 KB snippet; full HTML payload at `payloadPath`).

## Workflow

1. Read `./buyer-context.md` if present.
2. Determine: single case study or index?
3. Run `node ./scripts/audit-fetch.mjs <url>` via Bash. For a single study, look for `Article` in `jsonLd[]` (need `author`, `datePublished`, `about`); for an index, look for `CollectionPage`. `headings` and `visibleText` give the named-customer/outcome/date.
4. Extract customer identity, named contact, outcome, dates, schema.
5. If index: sample 3 representative case studies and apply the same checks.
6. Apply the universal rubric with case-study weights.
7. Compute composite, write report.

## Output Format

```markdown
# Case Study Audit — example.com/customers/zenith-labs
*Generated 2026-05-07. Buyer context: loaded. Customer audited: Zenith Labs.*

## Composite Score: 7.2 / 10

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Extractability | 8 | 2 | 16 |
| Schema & Structured Data | 5 | 2 | 10 |
| Buyer-Context Alignment | 7 | 2 | 14 |
| Trust & Citation-Worthiness | 8 | 4 | 32 |
| Agent-Actionability | 6 | 1 | 6 |
| Crawler Accessibility | 9 | 1 | 9 |
| **Total** | | **12** | **87 / 120 = 7.3** |

## Citation Snapshot

| Field | Value | Quotable? |
|-------|-------|-----------|
| Customer name | Zenith Labs | ✅ |
| Industry | fintech / payments | ✅ |
| Customer size | "350 engineers" stated; ~$50M ARR per Crunchbase | ✅ partial |
| Logo + alt | `alt="Zenith Labs logo"` | ✅ |
| Customer URL | linked to zenithlabs.com | ✅ |
| Named contact | Sarah Chen, VP Engineering, Zenith Labs | ✅ |
| Contact LinkedIn | not linked | ⚠️ |
| Testimonial quoted | "Acme cut our deploy time from 22 minutes to 90 seconds." | ✅ strong |
| Quantified outcome | 22 min → 90 sec deploy (94% reduction); 3x deploy frequency | ✅ |
| Engagement date | Q1 2026 | ✅ |
| `datePublished` schema | ❌ missing | — |
| `Article` JSON-LD | ❌ missing | — |

## Top 3 Issues
1. **No `Article` schema with `datePublished`.** — *Fix:* Add JSON-LD `Article` with `headline`, `author`, `datePublished`, `dateModified`, `about` (Zenith Labs Organization). — *Impact:* H — *Effort:* S
2. **Named contact lacks LinkedIn link or `Person` schema.** — *Fix:* Link Sarah Chen to her LinkedIn profile + add `Person` JSON-LD with `sameAs`. — *Impact:* M — *Effort:* S
3. **Customer size is in body text only.** — *Fix:* Add a metadata block (employees: 350, industry: fintech) that's both in HTML and in `Organization` schema. — *Impact:* M — *Effort:* S

## Detailed Findings

### Trust & Citation-Worthiness — 8/10
**What's working:** Named customer, named contact with title, quantified outcome with baseline, recent date. This is a citation-worthy story.
**What's broken:** Missing schema means an LLM has to infer structure from prose; missing LinkedIn means contact verification is harder.
**Specific fixes:** [as in Top 3]

(...)

## Recommended Next Steps
1. Add Article + Organization + Person + Quotation JSON-LD.
2. Link the named contact's LinkedIn.
3. If this case study is the strongest you have for fintech: link to it from `/industries/fintech` and the homepage proof strip.
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Anonymizing the customer to protect them | Anonymous = weak proof. Negotiate naming, or move the story off the marketing site |
| Vague outcomes ("transformed our workflow") | Always quantify — even "saved one engineer 4 hrs/week" is stronger |
| Stale case study (no date, content from 2021) | Update or sunset; old stories with no date reduce site-wide trust |
| Skipping schema because the prose is "good enough" | Schema is the difference between an LLM citing the page and the LLM summarizing the gist |
| For index pages: linking case studies with anchor "Read more" | Anchor text should name the customer + outcome |

## Reference

- `references/audit-engine.md` — full rubric.
