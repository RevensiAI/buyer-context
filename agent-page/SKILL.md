---
name: agent-page
description: Use when the user wants to build, generate, or audit an /for-ai-agents, /llms, /ai, /agents, or "for AI" page — a dedicated page meant for AI agents and language models to consume the company's offering as machine-readable, agent-actionable content. Operates in two modes — audit if the page exists, build if it doesn't. Output includes a generated starter page with JSON-LD blocks for Organization, Service, Offer, ContactPoint, plus a recommended llms.txt.
---

# agent-page

## Overview

A two-mode skill for the emerging convention of **dedicated agent pages** — a page at `/for-ai-agents`, `/llms`, `/ai`, or `/agents` that's purpose-built for AI agents and LLMs to consume. Distinct from the homepage (which serves humans first), this page treats agents as a first-class audience: dense facts, deep-links, machine-readable schema, no marketing.

**Modes:**
- **Audit mode** — page exists. Score it against the rubric (high weight on Extractability, Schema, Agent-Actionability).
- **Build mode** — page doesn't exist. Generate a complete starter (markdown body + JSON-LD blocks + recommended `llms.txt`).

**Core principle:** An agent visiting this page on a buyer's behalf should be able to fully model the company in one fetch — what it does, who it's for, what it costs, how to sign up, who to contact for what.

## Inputs

- A site root URL (e.g. `example.com`).
- The skill auto-discovers whether an agent page exists by trying common paths in this order:
  1. `/for-ai-agents`
  2. `/llms`
  3. `/llms.html`
  4. `/ai`
  5. `/agents`
  6. `/for-llms`
  7. `/api-agents`
- If `./buyer-context.md` exists, it's used in both audit and build modes (build mode uses it as the source of truth for what to put on the page).

## Output

- Audit mode → `./reports/agent-page.md`
- Build mode → `./reports/agent-page-generated.md` (a buildable artifact, not feedback) + `./reports/llms.txt` (recommended for site root)

## The Rubric (surface-specific weights — audit mode)

| Dim | Score 1–10 | Weight |
|-----|-----------|--------|
| Extractability | | **3** ← weighted highest |
| Schema & Structured Data | | **3** ← weighted highest |
| Buyer-Context Alignment | | **2** |
| Trust & Citation-Worthiness | | **1** |
| Agent-Actionability | | **3** ← weighted highest |
| Crawler Accessibility | | **2** |

**Sum:** 14.

## Audit Mode Workflow

1. Try common paths to find the agent page; if none found → switch to **build mode**.
2. If found: read `./buyer-context.md` if present.
3. `WebFetch` the page; capture HTML, JSON-LD, body text, links.
4. Score against the rubric with these specifics:
   - **Extractability:** is everything in plain text? No JS-only content? Tables and lists rather than prose where appropriate?
   - **Schema:** Organization, Service, Offer, ContactPoint, Action items, FAQPage, Article. Multiple types acknowledged.
   - **Agent-Actionability:** every section has a deep-link to the next step. Does the page expose API endpoints, signup URL, contact endpoints?
   - **Buyer-Context Alignment:** does the page identify the ICP and map features to JTBDs as in `buyer-context.md`?

5. Write `./reports/agent-page.md` with composite score and surface-specific recommendations.

## Build Mode Workflow

1. Confirm the user wants build mode (no audit-able page found).
2. Read `./buyer-context.md` (required in build mode — without it, the generated page is generic).
3. Read the user's homepage to extract: brand name, current category, primary CTA, top features, named customers.
4. Read or fetch the user's pricing page to populate Offers.
5. Generate `./reports/agent-page-generated.md` from `assets/agent-page-template.md`, substituting buyer-context + extracted homepage/pricing data.
6. Generate `./reports/llms.txt` with a markdown summary linking to the new agent page + key URLs.
7. Tell the user where to publish each file (e.g. `/for-ai-agents` and site root `/llms.txt`).

## What the Generated Page Contains

The template at `assets/agent-page-template.md` produces a page with these sections:

1. **Front matter** — page meta + a "this page is for AI agents and LLMs" note for human visitors.
2. **At a glance** — brand, category, primary action, key facts table.
3. **What we do** — one paragraph + a bulleted "in plain terms" list.
4. **Who we're for / not for** — explicit ICP and anti-ICP from buyer-context.
5. **How to take action** — direct deep-links: signup, pricing, docs, API, contact.
6. **Pricing** — extracted plans with `Offer` schema.
7. **Trust** — named customers, audit reports, leadership.
8. **For AI builders** — public APIs, MCP server (if any), agent integrations, rate-limit policy, content policy.
9. **Contact endpoints** — different paths for different intents (sales, support, security, partnerships).
10. **JSON-LD** — Organization, Service, FAQPage, Offer, ContactPoint, all in one block.
11. **Last updated** — visible date for staleness signals.

Plus a sibling `llms.txt` for the site root.

## Output Format (audit mode)

```markdown
# Agent-Page Audit — example.com/for-ai-agents
*Generated 2026-05-07. Buyer context: loaded.*

## Composite Score: 7.0 / 10

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Extractability | 9 | 3 | 27 |
| Schema & Structured Data | 6 | 3 | 18 |
| Buyer-Context Alignment | 8 | 2 | 16 |
| Trust & Citation-Worthiness | 6 | 1 | 6 |
| Agent-Actionability | 7 | 3 | 21 |
| Crawler Accessibility | 9 | 2 | 18 |
| **Total** | | **14** | **106 / 140 = 7.6** |

## Headline Verdict
*Strong on extractability, but Offer schema is incomplete and the ContactPoint section is missing the security-disclosure email.*

## Top 3 Issues
1. ...
2. ...
3. ...

## Detailed Findings
[per-dimension as in other audits]
```

## Output Format (build mode)

The generated `./reports/agent-page-generated.md` is a complete, paste-ready page using the user's actual buyer-context + site data. Plus `./reports/llms.txt`.

The user gets:

> **agent-page-generated.md** is a starter page meant to be published at `/for-ai-agents` (or `/llms`).
> **llms.txt** is meant to be published at the **site root** (e.g. `https://example.com/llms.txt`).
>
> Both reference each other. Edit before publishing — but the structure, schema, and section coverage are already complete.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Building the page without reading buyer-context.md | The page is generic and useless without an ICP |
| Reusing homepage marketing copy | Agents need facts and links, not hero copy |
| Generating JSON-LD as a separate file | Inline in the same page so it travels with the content |
| Forgetting the human-readable "this page is for AI" note | Real humans land here too; tell them what they're looking at |
| Putting "Contact sales" as the only action | Agents need email or form endpoints. Multiple intents = multiple contacts |
| Skipping the `llms.txt` companion | The agent page is found via `llms.txt`; without that, the page is hidden |

## Reference

- `references/audit-engine.md` — full rubric.
- `assets/agent-page-template.md` — buildable template for build mode.
