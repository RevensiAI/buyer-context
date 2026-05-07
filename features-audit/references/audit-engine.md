# Audit Engine — Universal AI-Readability Rubric

> Canonical rubric used by every audit skill in this collection. Each per-surface skill applies these six dimensions with its own **weight vector** so the composite score reflects what matters on that surface.

## The Six Dimensions

Each dimension is scored **1–10**:

- **9–10** — Exceptional; this is what other sites should copy.
- **7–8** — Strong; small refinements possible.
- **5–6** — Adequate; meaningful gaps.
- **3–4** — Weak; significant issues.
- **1–2** — Critical; rebuild this section.

---

### 1. Extractability

**What it measures:** Whether the page's offer, claim, and key facts are present in plain HTML text that any HTTP client can read without executing JavaScript or rendering canvas/video.

**Why AI agents care:** Most crawlers (GPTBot, ClaudeBot, PerplexityBot, CCBot) consume static HTML. Content locked in:
- A hero animation/video without a transcript or alt text
- Canvas elements
- JavaScript-rendered SPAs without server-side rendering or a static fallback
- Images-of-text (PDFs-as-images, screenshots used as headlines)
- Lottie / WebGL only

…is invisible. The model cannot quote it, summarize it, or cite it.

**Score 1–10:**
- **9–10** — Hero headline, subheadline, primary CTA copy, top 3 proof points, and pricing all present in HTML on initial response. No JS required.
- **7–8** — Most content extractable; one or two minor elements (e.g. animated metric counters) require JS.
- **5–6** — Headline extractable but supporting copy or proof points are JS-only or behind tabs that need interaction.
- **3–4** — Hero text is in an image or canvas; primary value prop only visible after render.
- **1–2** — Page returns a near-empty HTML shell; SPA with no SSR; everything requires JS execution.

**How to test:**
```bash
curl -A "GPTBot" -L https://example.com | grep -i "<your headline keyword>"
```
If the headline isn't there, the model can't see it.

---

### 2. Schema & Structured Data

**What it measures:** Presence and correctness of JSON-LD structured data (`<script type="application/ld+json">`). Microdata and RDFa count but JSON-LD is the modern standard.

**Why AI agents care:** Schema is the highest-confidence machine-readable signal. It's how an agent disambiguates "is this $50/month or $50 one-time?" or "is this a refund policy or a press release?" Models trained on the web have learned to weight `Offer.price` heavily; they have not learned to trust a `<span class="big-number">` next to dollar signs.

**Common schema by page type:**
- Homepage → `Organization`, `WebSite` (with `SearchAction`), `BreadcrumbList`
- Pricing → `Product` + `Offer` (with `priceSpecification`, `priceCurrency`, `eligibleQuantity`)
- About → `Organization`, `Person` (founders/leadership with `sameAs` links)
- Case study → `Article` (with `author`, `datePublished`, `about`)
- FAQ → `FAQPage` (with `mainEntity` of `Question` + `acceptedAnswer`)
- Comparison → `Product` + structured comparison table
- Feature page → `Service` or `SoftwareApplication`

**Score 1–10:**
- **9–10** — Multiple appropriate schema types present, valid against schema.org, with rich properties (sameAs, priceSpecification, datePublished, author).
- **7–8** — Primary schema present and correct; missing some optional but valuable properties.
- **5–6** — Some schema present but minimal (just `Organization` with `name` + `url`), or wrong type for the page.
- **3–4** — Schema is broken (invalid JSON, wrong nesting), incomplete, or only present in OpenGraph (which agents consume less).
- **1–2** — No JSON-LD at all.

**How to test:**
```bash
curl -L https://example.com | grep -A 30 'application/ld+json'
```
Validate at validator.schema.org or with `npx schema-org-validator`.

---

### 3. Buyer-Context Alignment

**What it measures:** Does the page communicate the ICP, JTBD, USP, and proof points stated in the user's `./buyer-context.md`? An agent acting on behalf of a specific buyer matches buyer intent against page claims; misalignment is a wasted impression.

**Why AI agents care:** When an agent has a brief like "find me a pipeline tool for a Series-B engineering team that's replacing Jenkins," it's matching that brief against page text. If the page says "a platform for everyone" and never names "engineering teams," "CI/CD," or "Jenkins replacement," the agent skips it. Specificity wins.

**No-anchor mode:** If `./buyer-context.md` is missing, score this dimension as **5/10 with low confidence** and note the gap in the report header.

**Score 1–10:**
- **9–10** — Page explicitly names the ICP segment, the job-to-be-done, the differentiating claim, and at least 2 of the 3 proof points from buyer-context.md, in the user's own words.
- **7–8** — Strong alignment but one of {ICP, JTBD, USP, proof} is implicit rather than explicit.
- **5–6** — Generic positioning that *could* describe the user but doesn't specifically. Or buyer-context absent (no-anchor mode).
- **3–4** — Page communicates a different positioning than buyer-context.md states.
- **1–2** — Page actively contradicts the stated positioning (e.g. buyer-context says "for enterprises" but page reads "for solo founders").

---

### 4. Trust & Citation-Worthiness

**What it measures:** Specific, named, sourced, dated, verifiable proof. The kind of fact a model will quote with high confidence.

**Why AI agents care:** Models prefer citing concrete signals (named customer, dated case study, audit report URL, leadership LinkedIn) over hand-wavy claims ("trusted by leading brands"). When summarizing a vendor, an agent looks for things it can attribute.

**Strong signals:**
- Named customer logos with links to a case study (not just a logo wall)
- Dated testimonials with full attribution (name, title, company, photo)
- Quantified outcomes ("reduced X by 40% in 6 months")
- Audit/compliance reports (SOC 2 with date, ISO 27001 cert URL)
- Leadership pages with bios + sameAs links to LinkedIn/GitHub
- Press coverage with publication name and date
- Public customer count or signup count, if material

**Weak signals (that reduce score):**
- Stock-photo testimonials ("J.S., Marketing Manager")
- Logos without case studies
- Vague claims ("best-in-class," "trusted by thousands")
- Outdated proof (testimonial from 2018 with no recent updates)
- Awards from no-name sources

**Score 1–10:**
- **9–10** — Multiple named, dated, quantified proof elements per surface; case studies linked; compliance reports public.
- **7–8** — Strong proof but some elements are dated or lack quantification.
- **5–6** — Mix of strong and weak signals; logos without case studies; testimonials with first names only.
- **3–4** — Mostly weak proof; vague claims dominate.
- **1–2** — No verifiable proof; only marketing copy.

---

### 5. Agent-Actionability

**What it measures:** Can an agent advance the buyer without a human? Direct deep-links, machine-readable pricing, public APIs, contact endpoints, clear next URLs. Or does the path forward require a human (call sales, schedule demo, fill 12-field form)?

**Why AI agents care:** Agentic buyers (an LLM with browser/HTTP tools) make progress by clicking and filling. The faster they can take the next step on behalf of their human, the more likely your offering survives the consideration step.

**Strong actionability:**
- Public pricing visible without login
- Self-serve signup with email-only or SSO
- Public API documentation with example requests
- Direct deep-links into product (e.g. `/integrations/slack` rather than "see all integrations")
- Documented webhook/callback endpoints
- Contact endpoint (mailto, contact form) accessible without account

**Weak actionability:**
- "Contact sales for pricing" (no public price)
- "Book a demo" as the only CTA
- 10+ field form to access whitepaper
- Captcha-walled or login-walled core pages
- Anti-bot challenge (Cloudflare, hCaptcha) on the homepage

**Score 1–10:**
- **9–10** — Self-serve from homepage to active account in <60 seconds; pricing public; API docs public.
- **7–8** — Mostly self-serve; one friction point (e.g. credit card required up front).
- **5–6** — Mixed: pricing public but signup gated, or self-serve product but pricing hidden.
- **3–4** — Demo-required, no self-serve, but at least pricing is published.
- **1–2** — "Contact us" everywhere; no public pricing; aggressive anti-bot.

---

### 6. Crawler Accessibility

**What it measures:** Whether AI bots are allowed to fetch the site at all, and whether the site provides discovery aids (sitemap, llms.txt).

**Why AI agents care:** If GPTBot is in robots.txt as `Disallow: /`, none of the above matters — the model never trains on, never indexes, and increasingly can't fetch the page even at runtime. Many providers respect robots.txt at runtime fetch as well as at training time.

**Bots to check** (allow these for AI-readability; deny only with intent):

| User-Agent | Operator | Purpose |
|------------|----------|---------|
| `GPTBot` | OpenAI | ChatGPT browsing + training |
| `ChatGPT-User` | OpenAI | User-initiated browsing |
| `OAI-SearchBot` | OpenAI | OpenAI search index |
| `ClaudeBot` | Anthropic | Claude training crawl |
| `Claude-User` | Anthropic | User-initiated browsing |
| `Claude-SearchBot` | Anthropic | Search index |
| `anthropic-ai` | Anthropic | Older UA |
| `PerplexityBot` | Perplexity | Search/answer index |
| `Perplexity-User` | Perplexity | User-initiated fetch |
| `Google-Extended` | Google | Gemini training opt-in |
| `Applebot-Extended` | Apple | Apple Intelligence training |
| `CCBot` | Common Crawl | Training data corpus |
| `cohere-ai` | Cohere | Training |
| `Bytespider` | ByteDance | TikTok / Doubao training |
| `Meta-ExternalAgent` | Meta | Meta AI fetch |
| `FacebookBot` | Meta | Meta AI |
| `Diffbot` | Diffbot | Knowledge graph |
| `omgili` | Webz.io | Aggregator |

**Discovery aids to check:**
- `/robots.txt` — explicit allow/disallow rules per bot
- `/sitemap.xml` — referenced from robots.txt, recently modified, parseable
- `/llms.txt` — the [llms.txt proposal](https://llmstxt.org): a markdown summary of the site for LLMs
- `/llms-full.txt` — fuller version with more URLs
- HTTP status: 200 on these paths, not 404 or redirect-loop

**Anti-bot:**
- Cloudflare bot challenge (`__cf_chl_jschl_tk__` cookie path)
- hCaptcha / reCAPTCHA gating
- 403 to non-browser User-Agents

**Score 1–10:**
- **9–10** — All major AI bots allowed in robots.txt; sitemap valid and current (< 30 days); `llms.txt` present and well-formed; no anti-bot on public pages.
- **7–8** — Most bots allowed; sitemap present; no `llms.txt`.
- **5–6** — Mixed allow/disallow; sitemap stale or absent; one or two AI bots blocked without clear reason.
- **3–4** — Several AI bots blocked; or anti-bot challenge gates the homepage.
- **1–2** — `Disallow: /` for User-Agent: * or for major AI bots; site invisible to LLMs.

**How to test:**
```bash
curl -L https://example.com/robots.txt
curl -L https://example.com/llms.txt
curl -A "GPTBot" -I https://example.com
```

---

## Weight Vectors by Surface

Each per-surface skill multiplies the dimension scores by these weights and divides by the sum of weights to produce a 1–10 composite.

| Surface | Extract | Schema | Align | Trust | Action | Crawl | Sum |
|---------|---------|--------|-------|-------|--------|-------|-----|
| homepage | 2 | 2 | 3 | 2 | 1 | 1 | 11 |
| pricing | 2 | 3 | 2 | 1 | 3 | 1 | 12 |
| about | 2 | 3 | 2 | 3 | 1 | 1 | 12 |
| comparison | 2 | 2 | 2 | 3 | 1 | 1 | 11 |
| features | 2 | 2 | 3 | 2 | 2 | 1 | 12 |
| case-study | 2 | 2 | 2 | 4 | 1 | 1 | 12 |
| faq | 2 | 4 | 2 | 1 | 1 | 2 | 12 |
| agent-page | 3 | 3 | 2 | 1 | 3 | 2 | 14 |

`crawler-audit` doesn't use this matrix — it scores Crawler Accessibility as the dominant dimension and reports the others as informational.

`competitor-audit` uses the homepage vector for cross-vendor comparison.

`full-audit` reports each surface's composite plus a site-wide weighted aggregate.

## Output Format (every audit)

```markdown
# <Surface> Audit — example.com/<path>
*Generated 2026-05-07. Buyer context: ./buyer-context.md (or "no-anchor mode").*

## Composite Score: 6.4 / 10

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Extractability | 8 | 2 | 16 |
| Schema & Structured Data | 4 | 3 | 12 |
| Buyer-Context Alignment | 7 | 2 | 14 |
| Trust & Citation-Worthiness | 6 | 1 | 6 |
| Agent-Actionability | 5 | 3 | 15 |
| Crawler Accessibility | 9 | 1 | 9 |
| **Total** | | **12** | **72 / 120 = 6.0** |

## Top 3 Strengths
1. ...
2. ...
3. ...

## Top 3 Issues (ranked by impact × ease)
1. **<Issue>** — <one-line> — *Fix:* <one-line> — *Impact:* H/M/L — *Effort:* S/M/L
2. ...
3. ...

## Detailed Findings (per dimension)
### Extractability — 8/10
**What's working:** ...
**What's broken:** ...
**Specific fixes:**
- ...

### Schema & Structured Data — 4/10
...

(...repeat for each dimension...)

## Recommended Next Steps
1. ...
2. ...
```
