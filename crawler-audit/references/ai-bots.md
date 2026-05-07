# AI Bot User-Agent Reference

Reference list of AI-related crawler user-agents to check in `robots.txt`. Each row has the exact UA string to match (case-sensitive in robots.txt convention), the operator, and what the bot is used for. When the operator publishes its UA documentation, the URL is given for verification.

## OpenAI

| User-Agent | Purpose | Notes |
|------------|---------|-------|
| `GPTBot` | Training data crawl for OpenAI foundation models | [docs](https://platform.openai.com/docs/bots) |
| `ChatGPT-User` | User-initiated browsing in ChatGPT | Not a continuous crawl; fetches when a user asks |
| `OAI-SearchBot` | OpenAI's search index for ChatGPT search | Newer; emerged 2024 |

## Anthropic

| User-Agent | Purpose | Notes |
|------------|---------|-------|
| `ClaudeBot` | Training crawl for Claude foundation models | [docs](https://support.anthropic.com/en/articles/8896518) |
| `Claude-User` | User-initiated browsing/research | Not continuous |
| `Claude-SearchBot` | Search index for Claude search | |
| `anthropic-ai` | Older Anthropic crawler | Some sites still see this UA |

## Perplexity

| User-Agent | Purpose | Notes |
|------------|---------|-------|
| `PerplexityBot` | Index for Perplexity search | [docs](https://docs.perplexity.ai/guides/bots) |
| `Perplexity-User` | User-initiated fetch in Perplexity | |

## Google AI

| User-Agent | Purpose | Notes |
|------------|---------|-------|
| `Google-Extended` | Opt-out token for Gemini training; does NOT affect Google Search indexing | If you `Disallow: /` it, your content can still appear in Google Search but won't be used for Gemini training. [docs](https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers#google-extended) |

## Apple AI

| User-Agent | Purpose | Notes |
|------------|---------|-------|
| `Applebot-Extended` | Opt-out token for Apple Intelligence training | Similar to Google-Extended; doesn't affect Siri/Spotlight indexing |

## Common Crawl

| User-Agent | Purpose | Notes |
|------------|---------|-------|
| `CCBot` | Common Crawl corpus — used by many model trainers | Blocking CCBot blocks training data for OpenAI, Anthropic (historically), Mistral, Together, and many open-source models |

## Cohere

| User-Agent | Purpose | Notes |
|------------|---------|-------|
| `cohere-ai` | Cohere training crawl | |
| `cohere-training-data-crawler` | Newer UA | |

## ByteDance

| User-Agent | Purpose | Notes |
|------------|---------|-------|
| `Bytespider` | TikTok / Doubao training | Aggressive crawler historically; many sites block by default |

## Meta

| User-Agent | Purpose | Notes |
|------------|---------|-------|
| `Meta-ExternalAgent` | Meta AI fetch (Llama-related products) | [docs](https://developers.facebook.com/docs/sharing/webmasters/web-crawlers/) |
| `FacebookBot` | Older Meta crawler | Distinct from `facebookexternalhit` (which is for link previews, not AI) |

## Other notable

| User-Agent | Purpose | Notes |
|------------|---------|-------|
| `Diffbot` | Knowledge graph used by various AI tools | |
| `omgili` (Webz.io) | News/web aggregator feeding LLMs | |
| `YouBot` | You.com search/AI | |
| `Amazonbot` | Amazon AI products | Not strictly "AI training" but Amazon-aligned |
| `Timpibot` | Timpi search index used by some AI tools | |

## Bots that are NOT AI-specific (don't confuse)

These appear often in robots.txt but are not AI-training crawlers:

- `Googlebot`, `Googlebot-Image`, `Googlebot-News` — Google Search; **distinct from** `Google-Extended`
- `Bingbot` — Microsoft search; distinct from `MicrosoftBot` AI variants
- `DuckDuckBot` — DDG search
- `facebookexternalhit` — Open Graph link preview, not AI
- `Twitterbot`, `LinkedInBot`, `Slackbot-LinkExpanding` — social link previews
- `AhrefsBot`, `SemrushBot`, `MJ12bot` — SEO tools

## Reading robots.txt rules

A bot is "allowed" if:
1. It has its own block with `Allow:` rules covering the URL, OR
2. The wildcard `User-agent: *` block doesn't `Disallow` it, AND no specific block for that bot disallows it.

A bot is "disallowed" if:
1. Its specific `User-agent: <name>` block has `Disallow: /` (or covers the URL), OR
2. The wildcard `User-agent: *` block disallows it AND there's no overriding specific allow.

**Order matters:** specific rules override wildcards. Most robots.txt parsers follow [Google's convention](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt) — longest-matching path wins.

## Common patterns

```robotstxt
# Allow all bots (default for most sites)
User-agent: *
Allow: /

# Block all AI training but allow runtime fetch
User-agent: GPTBot
Disallow: /
User-agent: ClaudeBot
Disallow: /
User-agent: CCBot
Disallow: /
User-agent: Google-Extended
Disallow: /
User-agent: Applebot-Extended
Disallow: /

User-agent: ChatGPT-User
Allow: /
User-agent: Claude-User
Allow: /
User-agent: Perplexity-User
Allow: /

# Block aggressive scrapers
User-agent: Bytespider
Disallow: /
```

## When to deny vs allow

- **Always allow** runtime "user-fetch" bots (`ChatGPT-User`, `Claude-User`, `Perplexity-User`) — these only fetch when a real human asks. Blocking them = your content can't be cited when a buyer asks an LLM about your category.
- **Allow training bots** if you want your content in models' training data (default for most marketing sites).
- **Disallow training bots** only if you have a deliberate IP/legal stance — e.g. content licensing concerns.
- **Always allow** search-index bots (`OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`) for marketing sites — these are the runtime equivalent of Google for LLMs.
