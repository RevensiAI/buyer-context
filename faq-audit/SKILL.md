---
name: faq-audit
description: Use when the user wants to audit a FAQ, frequently-asked-questions, or help-center entry page for AI/LLM readability. Triggers on URLs containing /faq, /faqs, /help, /support, /questions, or pages with question-and-answer structure. Also when user asks "audit my FAQ", "is my FAQ LLM-readable", or wants AI-readability feedback on a Q&A page. Scores whether each question stands alone, answers are self-contained, and the page is marked up with FAQPage JSON-LD that AI agents and Google AI Overviews extract from.
---

# faq-audit

## Overview

Audits a FAQ page for AI/LLM readability. FAQs are the single highest-leverage page for LLM citation: a well-marked-up `FAQPage` schema gets ingested directly by Google AI Overviews, ChatGPT search, and Perplexity, often producing exact-quote answers in their results. The audit checks whether the page is structured for that ingestion.

**Core principle:** Every FAQ entry should be a self-contained Q&A pair an LLM can extract and quote without needing the surrounding page. FAQPage schema is the single biggest lever.

## Inputs

- A FAQ page URL.
- Optional: `./buyer-context.md` for buyer-question alignment.

## Output

`./reports/faq-audit.md`

## The Rubric (surface-specific weights)

| Dim | Score 1–10 | Weight |
|-----|-----------|--------|
| Extractability | | **2** |
| Schema & Structured Data | | **4** ← dominant |
| Buyer-Context Alignment | | **2** |
| Trust & Citation-Worthiness | | **1** |
| Agent-Actionability | | **1** |
| Crawler Accessibility | | **2** |

**Sum:** 12.

## Surface-Specific Checks

### FAQPage JSON-LD presence and validity

The page should have a `FAQPage` JSON-LD block:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Do you offer a free trial?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes — 14 days, no credit card required. <a href=\"/signup\">Start your trial</a>."
      }
    },
    ...
  ]
}
```

Validate:
- One `FAQPage` per page (not multiple)
- Each Q&A has `@type: Question` with a `name` field (the question)
- Each has an `acceptedAnswer` with `@type: Answer` and `text` field
- Answer `text` contains the full answer (not just a teaser)
- HTML allowed inside answer text (links, lists) — many implementations support this

### Atomic Q&A pairs

Each entry should:
- Be a complete question that makes sense without surrounding context (passes the "if this question + answer were extracted alone, would it still answer the question?" test)
- Have an answer that's self-contained — doesn't say "see above" or "as mentioned in section 3"
- Use buyer-natural phrasing for the question (matches how a buyer would actually ask)

### Question phrasing alignment

Compare FAQ questions against likely buyer queries. Example:
- Buyer asks an LLM: "Does Acme support SSO?"
- Strong FAQ: `"Do you support SSO and SAML?"` — natural, exact-match-able
- Weak FAQ: `"Identity & Access Management Capabilities"` — heading style, doesn't match a question

If `./buyer-context.md` lists buyer titles and JTBDs, derive likely questions from those and check coverage:
- Buyer = VP Engineering → likely asks about: SSO, audit logs, SOC 2, on-prem options, pricing tiers, support SLA
- Coverage map: which of these questions does the FAQ actually answer?

### Answer self-containment

Each answer should:
- Be a complete sentence or paragraph (not a fragment)
- Avoid pronouns whose antecedent is on a different page ("It does this by..." with "it" undefined)
- Include any numbers, dates, or specific limits that make the answer cite-able
- Link to deeper docs only as supplements, not in lieu of the answer

### Crawler accessibility extra check

For FAQs specifically, check:
- The page is in the sitemap (so AI Overviews indexes it)
- Not behind authentication
- HTML structure: each Q is an `<h2>` or `<h3>` with the answer in the following `<p>` / div — accessible without JS (FAQ accordions often hide answers under JS-only `display: none` toggles, but the content should still be in the HTML, just visually hidden)

### Anti-pattern: tab/accordion that lazy-loads answers

Some FAQ implementations only fetch answers via JS when the user clicks. This means agents that don't run JS (most crawlers) see only the questions. **Critical fail:** if the answer text isn't in the initial HTML response, the FAQPage schema is hollow and the answers are invisible.

## Tools

`node ./scripts/audit-fetch.mjs <url>` (via Bash) — fetches fresh and returns JSON with `status`, `title`, `description`, `canonical`, `openGraph`, `twitter`, `jsonLd[]` (parsed; each block has `valid: true|false`), `jsonLdTypes[]`, `headings`, `antiBotSignals[]`, `visibleText` (5 KB snippet; full HTML payload at `payloadPath`).

## Workflow

1. Read `./buyer-context.md` if present.
2. Run `node ./scripts/audit-fetch.mjs <url>` via Bash. Search `jsonLdTypes` for `FAQPage`; if found, walk the matching block's `mainEntity[]` for `Question` + `acceptedAnswer` shape. Use `visibleText` (or read `payloadPath` for raw HTML) to enumerate Q&A pairs visible to a non-JS crawler.
3. Validate `FAQPage` JSON-LD presence and structure.
4. Enumerate Q&A pairs from the visible HTML; check each against schema entries (mismatch = problem).
5. Score each Q&A on phrasing, self-containment, completeness.
6. If buyer-context loaded: derive expected questions from buyer titles + JTBDs; produce coverage map.
7. Apply universal rubric with FAQ weights.
8. Compute composite, write report.

## Output Format

```markdown
# FAQ Audit — example.com/faq
*Generated 2026-05-07. Buyer context: loaded.*

## Composite Score: 5.5 / 10

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Extractability | 8 | 2 | 16 |
| Schema & Structured Data | 2 | 4 | 8 |
| Buyer-Context Alignment | 6 | 2 | 12 |
| Trust & Citation-Worthiness | 5 | 1 | 5 |
| Agent-Actionability | 6 | 1 | 6 |
| Crawler Accessibility | 9 | 2 | 18 |
| **Total** | | **12** | **65 / 120 = 5.4** |

## FAQPage Schema
- ❌ **No `FAQPage` JSON-LD detected.** This is the single biggest miss.
- 18 Q&A pairs in HTML are not exposed to LLMs as structured data.

## Q&A Inventory (18 entries on page)

| Q | Phrasing matches buyer query? | Answer self-contained? | Answer in initial HTML? |
|---|-------------------------------|------------------------|--------------------------|
| "Do you offer a free trial?" | ✅ | ✅ | ✅ |
| "Identity & Access Management Capabilities" | ❌ heading not question | ⚠️ partial | ✅ |
| "Pricing" | ❌ heading not question | ❌ refers to pricing page | ✅ |
| "What's your SLA?" | ✅ | ✅ specific (99.9%, 30-day credit) | ✅ |
| ... | ... | ... | ... |

## Buyer-Question Coverage (derived from buyer-context.md)

Expected from "VP Engineering" + "Series B SaaS replacing Jenkins" buyer:
- ✅ "Do you support SSO?" — covered
- ✅ "What's your SLA?" — covered
- ✅ "Are you SOC 2 compliant?" — covered (with audit date)
- ❌ "How do I migrate from Jenkins?" — **not covered** (high-relevance gap)
- ❌ "Do you have a Terraform provider?" — **not covered**
- ⚠️ "What's your data residency story?" — only EU mentioned, not other regions

## Top 3 Issues
1. **No FAQPage schema.** — *Fix:* Add JSON-LD `FAQPage` with each Q&A. This is the highest-leverage fix on this page. — *Impact:* H — *Effort:* M
2. **3 entries are headings, not questions ("Pricing", "Identity & Access").** — *Fix:* Rewrite as questions ("How does pricing work?", "Do you support SSO?"). — *Impact:* M — *Effort:* S
3. **Missing buyer-relevant questions: Jenkins migration, Terraform, data residency.** — *Fix:* Add 3 entries covering these — they map to buyer-context JTBDs. — *Impact:* H — *Effort:* M

## Detailed Findings

### Schema & Structured Data — 2/10
**What's working:** Page has `BreadcrumbList`.
**What's broken:** No `FAQPage` schema at all. Even one entry would lift this score.
**Specific fixes:** [JSON-LD example]

### Buyer-Context Alignment — 6/10
**What's working:** Covers SSO, SOC 2, SLA — three core enterprise concerns.
**What's broken:** Misses the buyer-context-named differentiating angle ("replacing Jenkins"). A VP Engineering reading this FAQ wouldn't see that the product is positioned as a Jenkins replacement.
**Specific fixes:** Add "How does Acme compare to Jenkins?" or "Can I migrate from Jenkins?"

### Crawler Accessibility — 9/10
**What's working:** Answers are in initial HTML (the accordion CSS hides them, but they're there). FAQ page is in the sitemap.
[informational]

(...)

## Recommended Next Steps
1. Add `FAQPage` JSON-LD covering all 18 entries (single largest lever).
2. Convert 3 heading-style entries to questions.
3. Add 3 buyer-relevant questions: Jenkins migration, Terraform, data residency.
4. Run `/case-study-audit` next — FAQ + case studies together cover most of an LLM's pre-purchase research.
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Trusting that an FAQ accordion "looks like" an FAQ to LLMs | Without `FAQPage` schema, it's just paragraphs. LLMs treat schema-backed Q&A very differently |
| Writing FAQ entries as section headings ("Pricing", "Support") | Phrase as questions; that's how buyers actually query |
| Answers that say "see above" or "click here for details" | Self-containment matters — agents extract the answer alone |
| FAQ accordions that lazy-load answers via JS | Critical fail: schema is hollow if answer text isn't in the HTML response |
| Skipping the buyer-question coverage check | The most useful FAQ is the one whose questions match the buyer's actual queries |

## Reference

- `references/audit-engine.md` — full rubric.
