# Privacy Policy

*Last updated: 2026-05-08*

This policy applies to the `revensi` Claude Code plugin and the broader buyer-context skill collection (collectively, "the Plugin") maintained by Revensi.

## What the Plugin does

The Plugin runs entirely on your local machine (or inside your Claude Code Cowork sandbox). It is a collection of audit skills that fetch public web pages you specify and produce Markdown reports. There is no telemetry, no usage analytics, no error reporting, and no install ping.

## Data the Plugin sends

- **Public URLs you specify.** When you run an audit, the Plugin makes HTTP requests to the URLs you pass in (your own site, a competitor's site, or a single page). These are ordinary browser-like fetches. Fetched HTML stays in your local reports directory — Revensi does not receive it.
- **Brave Search API (optional).** If you set the `BRAVE_API_KEY` environment variable, `/revensi:competitor-audit` queries the [Brave Search API](https://brave.com/search/api/) to discover competitors when no URL is provided. The query string and your API key are sent directly to Brave under your account. Revensi does not see this traffic.
- **Your AI runtime's network calls.** Your Claude Code (or other Agent Skills runtime) sends prompts and tool results to its provider (Anthropic, OpenAI, etc.) under that provider's privacy policy — not Revensi's. The Plugin does not modify or proxy those calls.

## Data the Plugin stores

All Plugin output stays on your filesystem. Nothing is uploaded to Revensi or to any other server by the Plugin.

- **`./reports/`** — audit output in your working directory, including raw fetch payloads at `./reports/fetch_<sha1>.json` (sha-keyed by URL + User-Agent, overwritten on subsequent runs).
- **`./buyer-context.md`** — your positioning anchor, written by `/revensi:buyer-context` to your working directory.

## Data Revensi collects

**None.** Revensi does not operate any server that the Plugin contacts. The Plugin's source is distributed via GitHub at [github.com/RevensiAI/buyer-context](https://github.com/RevensiAI/buyer-context); cloning, updates, and issue activity go through GitHub under [GitHub's privacy policy](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).

## Third parties

- **GitHub** — Plugin distribution and updates.
- **Brave Search** — only if you provide a `BRAVE_API_KEY` and run `/revensi:competitor-audit` without specifying competitor URLs.
- **Sites you audit** — your audit traffic appears to those sites as ordinary browser-like fetches under the relevant User-Agent (a real browser UA, `GPTBot`, or `curl`, depending on the check).

## Changes to this policy

If the Plugin's behavior changes in a way that affects this policy, the *Last updated* date above will change and the diff will be visible in the repository's git history.

## Contact

Questions about this policy: [hello@revensi.com](mailto:hello@revensi.com) or open an issue at [github.com/RevensiAI/buyer-context/issues](https://github.com/RevensiAI/buyer-context/issues).
