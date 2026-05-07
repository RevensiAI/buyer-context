---
name: crawler-audit
description: Use when the user wants to check whether AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended, etc.) can reach their site, audit their robots.txt for AI-bot rules, check for llms.txt or sitemap.xml, validate homepage JSON-LD/schema markup, or detect anti-bot challenges that block LLMs. The infrastructure-layer audit that runs before other surface audits in this collection.
---

# crawler-audit

## Overview

Audits the **infrastructure layer** that determines whether AI crawlers and agentic browsers can reach the site at all. If GPTBot is blocked in `robots.txt`, the rest of the site's AI-readability work is wasted — models never see it.

**Core principle:** Crawler accessibility is the foundation. Every other audit assumes it; this one verifies it.

This is the only audit that doesn't read `./buyer-context.md` — the checks here are universal regardless of positioning.

## Inputs

- A domain or homepage URL (`example.com` or `https://example.com`).

## Output

`./reports/crawler-audit.md`

## What It Checks

### 1. `robots.txt`

Fetch `https://<domain>/robots.txt`. Parse and produce an **allow/disallow matrix** for these AI bots (full list + UA strings in `references/ai-bots.md`):

- OpenAI: `GPTBot`, `ChatGPT-User`, `OAI-SearchBot`
- Anthropic: `ClaudeBot`, `Claude-User`, `Claude-SearchBot`, `anthropic-ai`
- Perplexity: `PerplexityBot`, `Perplexity-User`
- Google AI: `Google-Extended`
- Apple AI: `Applebot-Extended`
- Common Crawl: `CCBot`
- Cohere: `cohere-ai`
- ByteDance: `Bytespider`
- Meta: `Meta-ExternalAgent`, `FacebookBot`
- Diffbot, omgili (aggregators)

For each: report **Allowed / Disallowed / Implicit (covered by `*` rule) / Not mentioned**.

Also report:
- Sitemap directive present? Points to a valid URL?
- `Crawl-delay` set? (Some bots ignore; still informational.)
- Any blanket `Disallow: /` for a specific UA without a stated reason — flag for user review.

### 2. `llms.txt` and `llms-full.txt`

Fetch `https://<domain>/llms.txt` and `/llms-full.txt`. For each:
- Status code (200 = present, 404 = absent, anything else = fix)
- If present: well-formed markdown? Sections match the [llms.txt proposal](https://llmstxt.org)? URLs valid?
- If absent: flag as a missed opportunity, not a critical failure (it's emerging-standard, not required).

### 3. `sitemap.xml`

If the sitemap URL was found in robots.txt, use it. Otherwise try `https://<domain>/sitemap.xml`, `/sitemap_index.xml`, `/sitemap.xml.gz`.

Report:
- Reachable? Valid XML?
- URL count
- Last-modified date of the sitemap itself (stale = older than 60 days)
- Any `<lastmod>` dates on individual URLs newer than 30 days? (Indicates the sitemap is regenerated.)
- If sitemap-index: how many child sitemaps?

### 4. Homepage HTML structural signals

`WebFetch` the homepage and check:
- `<title>` — present, non-generic, < 60 chars
- `<meta name="description">` — present, 50–160 chars
- OpenGraph: `og:title`, `og:description`, `og:image`, `og:type`, `og:url`
- Twitter Card: `twitter:card`, `twitter:title`, `twitter:description`
- `<link rel="canonical">` — present, points to the canonical URL (no trailing slash mismatch)
- `<link rel="alternate" hreflang="...">` if multilingual
- JSON-LD `<script type="application/ld+json">`: enumerate all types found (Organization, WebSite, BreadcrumbList, etc.)

### 5. Anti-bot detection

Try fetching the homepage with three different User-Agents and record the response:
- `Mozilla/5.0 ...` (browser UA) — should return 200 with full HTML
- `GPTBot` — should return 200 (or 403/429 if explicitly blocked)
- bare `curl/8.0` — informational

Flag if:
- Response is 403/429/503 to `GPTBot`
- Response is 200 but body is `<title>Just a moment...</title>` (Cloudflare challenge)
- Response sets `__cf_chl_jschl_tk__` or similar challenge cookies
- Response is < 1KB (likely a bot wall)

## Scoring

Crawler-audit emphasizes the **Crawler Accessibility** dimension above all others. It still reports the other 5 dimensions briefly (since the homepage HTML was fetched anyway), but the composite score weights Crawler Accessibility heavily.

**Weight vector for crawler-audit:** `[1, 1, 0, 1, 1, 5]` — Crawler Accessibility = 5x weight, Buyer-Context Alignment = 0 (not relevant here).

**Score Crawler Accessibility 1–10:**
- **9–10** — All major AI bots allowed; sitemap < 30 days old; `llms.txt` present and well-formed; no anti-bot.
- **7–8** — Most bots allowed; sitemap present; no `llms.txt`.
- **5–6** — Mixed allow/disallow; sitemap stale or absent; one or two AI bots blocked without clear reason.
- **3–4** — Several AI bots blocked, or anti-bot challenge gates the homepage.
- **1–2** — `Disallow: /` for User-Agent: * or for major AI bots; site invisible to LLMs.

## Output Format

```markdown
# Crawler Audit — example.com
*Generated 2026-05-07.*

## Headline
**Crawler Accessibility: 7/10.** GPTBot, ClaudeBot, and PerplexityBot are allowed.
`llms.txt` is missing. Sitemap is current (last regenerated 4 days ago).

## AI Bot Allow/Disallow Matrix

| Bot | Operator | Status | Source |
|-----|----------|--------|--------|
| GPTBot | OpenAI | ✅ Allowed | implicit (no specific rule, no `*` Disallow) |
| ChatGPT-User | OpenAI | ✅ Allowed | implicit |
| ClaudeBot | Anthropic | ✅ Allowed | explicit `Allow: /` |
| Claude-User | Anthropic | ✅ Allowed | implicit |
| PerplexityBot | Perplexity | ❌ Disallowed | explicit `Disallow: /` |
| Google-Extended | Google | ⚠️ Not mentioned | (defaults to allowed; opt-out absent) |
| Applebot-Extended | Apple | ✅ Allowed | implicit |
| CCBot | Common Crawl | ❌ Disallowed | explicit `Disallow: /` |
| Bytespider | ByteDance | ❌ Disallowed | explicit `Disallow: /` |
| Meta-ExternalAgent | Meta | ⚠️ Not mentioned | (defaults to allowed) |

## Discovery Aids

- ✅ `sitemap.xml` — 247 URLs, last-modified 2026-05-03 (4 days old)
- ❌ `llms.txt` — 404
- ❌ `llms-full.txt` — 404

## Homepage HTML Signals

- ✅ `<title>` — "Acme — The CI/CD platform for engineering teams" (54 chars)
- ✅ `<meta description>` — 142 chars
- ✅ OpenGraph complete
- ✅ Canonical: `https://example.com/`
- ⚠️ JSON-LD: only `Organization` (missing `WebSite`, `BreadcrumbList`)

## Anti-Bot

- ✅ Browser UA → 200, full HTML
- ✅ GPTBot UA → 200, full HTML
- (No Cloudflare challenge; no captcha; no UA filtering detected.)

## Top 3 Issues (impact × ease)

1. **PerplexityBot, CCBot, Bytespider blocked.** — *Fix:* If the block was intentional (training-data concerns), document why; if not, change `Disallow: /` to `Allow: /` for these UAs in `robots.txt`. — *Impact:* H — *Effort:* S
2. **No `llms.txt`.** — *Fix:* Add `https://example.com/llms.txt` summarizing the site for LLMs (see llmstxt.org). Reference key URLs: pricing, docs, /vs/ pages. — *Impact:* M — *Effort:* M
3. **JSON-LD on homepage minimal — only `Organization`.** — *Fix:* Add `WebSite` (with `SearchAction`) and `BreadcrumbList`. — *Impact:* M — *Effort:* S

## Detailed Findings

### Crawler Accessibility — 7/10
**What's working:** Major AI bots from OpenAI, Anthropic, Apple are allowed. Sitemap fresh and complete.
**What's broken:** Three crawlers blocked without clear rationale; no `llms.txt`.
**Specific fixes:** [as above]

### Schema & Structured Data — 5/10
[informational, lower-confidence since this is a structural audit not a content audit]

(...)

## Recommended Next Steps

1. Decide intent on PerplexityBot/CCBot/Bytespider blocks; document or unblock.
2. Publish `llms.txt`.
3. Run `/homepage-audit example.com` next to evaluate above-the-fold AI-readability.
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Reporting "robots.txt blocks AI" without checking each bot — different bots have different rules | Always produce the full matrix; bots are not interchangeable |
| Treating absent `llms.txt` as a critical failure | It's emerging — flag as opportunity, not blocker |
| Forgetting to compare browser UA vs GPTBot UA responses | Cloudflare-style anti-bot only shows up in the comparison |
| Trying to score Buyer-Context Alignment | Not relevant for an infrastructure audit; weight = 0 |
| Not extracting `Sitemap:` directive from robots.txt before guessing the URL | The directive is authoritative |

## Reference

- `references/ai-bots.md` — full table of AI bot user-agents, operators, and what each does.
