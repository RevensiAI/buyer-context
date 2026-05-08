#!/usr/bin/env node
// audit-fetch.mjs — deterministic page fetcher for AI-readability audits.
//
// Usage:
//   node audit-fetch.mjs <url>
//                        [--ua=browser|gptbot|chatgpt-user|claudebot|perplexitybot|curl|<custom-string>]
//                        [--cache=<dir>]   default .audit-cache
//                        [--no-cache]      skip read-from-cache (still writes)
//                        [--full]          include full HTML and full visible text in stdout
//                        [--timeout=<ms>]  default 15000
//
// Stdout: a compact JSON summary (jsonLd parsed, OG tags, canonical, anti-bot signals,
// visibleText snippet). Full HTML + headers are persisted under <cache>/<sha>.json so
// downstream consumers can Read it on demand.
//
// Idempotently appends `.audit-cache/` and `reports/` to a sibling `.gitignore` on first run.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

const UA_PRESETS = {
  browser:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  gptbot:
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)',
  'chatgpt-user':
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ChatGPT-User/1.0; +https://openai.com/bot)',
  claudebot: 'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  'claude-user': 'Mozilla/5.0 (compatible; Claude-User/1.0; +Claude-User@anthropic.com)',
  perplexitybot:
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://docs.perplexity.ai/guides/bots)',
  ccbot: 'CCBot/2.0 (https://commoncrawl.org/faq/)',
  'google-extended': 'Mozilla/5.0 (compatible; Google-Extended/1.0; +https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers)',
  curl: 'curl/8.4.0',
};

const SUMMARY_TEXT_LIMIT = 5000;

function parseArgs(argv) {
  const args = { url: null, ua: 'browser', cache: '.audit-cache', noCache: false, full: false, timeout: 15000 };
  for (const arg of argv) {
    if (arg.startsWith('--ua=')) args.ua = arg.slice(5);
    else if (arg.startsWith('--cache=')) args.cache = arg.slice(8);
    else if (arg === '--no-cache') args.noCache = true;
    else if (arg === '--full') args.full = true;
    else if (arg.startsWith('--timeout=')) args.timeout = parseInt(arg.slice(10), 10);
    else if (!arg.startsWith('--') && !args.url) args.url = arg;
  }
  return args;
}

function resolveUA(spec) {
  return UA_PRESETS[spec.toLowerCase()] ?? spec;
}

function cacheKey(url, ua) {
  return createHash('sha1').update(`${url}\n${ua}`).digest('hex');
}

function ensureGitignore(cacheDir) {
  const gi = '.gitignore';
  if (!existsSync(gi)) return;
  const body = readFileSync(gi, 'utf8');
  const lines = new Set(body.split(/\r?\n/).map((l) => l.trim()));
  const wantCache = cacheDir.replace(/\/$/, '') + '/';
  const wantReports = 'reports/';
  const additions = [];
  if (!lines.has(wantCache) && !lines.has(wantCache.slice(0, -1))) additions.push(wantCache);
  if (!lines.has(wantReports) && !lines.has('reports')) additions.push(wantReports);
  if (additions.length) {
    const sep = body.endsWith('\n') ? '' : '\n';
    appendFileSync(gi, `${sep}# buyer-context audits\n${additions.join('\n')}\n`);
  }
}

function extractJsonLd(html) {
  const blocks = [];
  const re = /<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw) continue;
    try {
      blocks.push({ valid: true, parsed: JSON.parse(raw) });
    } catch (err) {
      blocks.push({ valid: false, error: err.message, raw: raw.slice(0, 500) });
    }
  }
  return blocks;
}

function extractMetaTags(html) {
  const og = {};
  const tw = {};
  const re = /<meta\b([^>]*)>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1];
    const prop = attrs.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i);
    const content = attrs.match(/\bcontent\s*=\s*["']([^"']*)["']/i);
    if (!prop || !content) continue;
    const key = prop[1];
    const val = content[1];
    if (key.startsWith('og:')) og[key] = val;
    else if (key.startsWith('twitter:')) tw[key] = val;
  }
  return { og, twitter: tw };
}

function extractTitle(html) {
  const m = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

function extractMeta(html, name) {
  const re = new RegExp(`<meta\\b[^>]*\\b(?:name|property)\\s*=\\s*["']${name}["'][^>]*>`, 'i');
  const m = html.match(re);
  if (!m) return null;
  const c = m[0].match(/\bcontent\s*=\s*["']([^"']*)["']/i);
  return c ? c[1] : null;
}

function extractCanonical(html) {
  const m = html.match(/<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/i);
  if (!m) return null;
  const h = m[0].match(/\bhref\s*=\s*["']([^"']*)["']/i);
  return h ? h[1] : null;
}

function extractHreflangs(html) {
  const out = [];
  const re = /<link\b[^>]*\brel\s*=\s*["']alternate["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const lang = m[0].match(/\bhreflang\s*=\s*["']([^"']+)["']/i);
    const href = m[0].match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if (lang && href) out.push({ hreflang: lang[1], href: href[1] });
  }
  return out;
}

function extractHeadings(html) {
  const out = { h1: [], h2: [] };
  for (const tag of ['h1', 'h2']) {
    const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    let m;
    while ((m = re.exec(html)) !== null) {
      const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text) out[tag].push(text);
    }
  }
  return out;
}

function extractVisibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function detectAntiBot(html, status, headers) {
  const flags = [];
  if (status === 403) flags.push('http-403');
  if (status === 429) flags.push('http-429');
  if (status === 503) flags.push('http-503');
  if (html.includes('__cf_chl_')) flags.push('cloudflare-challenge-token');
  if (/just a moment\.\.\./i.test(html)) flags.push('cloudflare-just-a-moment');
  if (/cf-browser-verification|cf-chl-bypass/i.test(html)) flags.push('cloudflare-browser-verification');
  if (/recaptcha|hcaptcha/i.test(html)) flags.push('captcha-present');
  const setCookie = headers['set-cookie'];
  if (setCookie && /(__cf_bm|cf_clearance)/.test(Array.isArray(setCookie) ? setCookie.join(';') : setCookie)) {
    flags.push('cloudflare-cookie');
  }
  if (html.length < 256) flags.push('body-tiny');
  return flags;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url) {
    console.error('Usage: audit-fetch <url> [--ua=preset|custom] [--cache=dir] [--no-cache] [--full] [--timeout=ms]');
    process.exit(1);
  }
  const ua = resolveUA(args.ua);
  const cacheDir = resolve(args.cache);
  const cachePath = join(cacheDir, `${cacheKey(args.url, ua)}.json`);

  if (!args.noCache && existsSync(cachePath)) {
    const cached = JSON.parse(readFileSync(cachePath, 'utf8'));
    cached.fromCache = true;
    cached.cacheAgeSec = Math.round((Date.now() - new Date(cached.fetchedAt).getTime()) / 1000);
    emit(cached, args, cachePath);
    return;
  }

  ensureGitignore(args.cache);
  if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });

  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), args.timeout);
  let res;
  let html;
  let error = null;
  try {
    res = await fetch(args.url, {
      headers: {
        'User-Agent': ua,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    html = await res.text();
  } catch (e) {
    error = { name: e.name, message: e.message };
  } finally {
    clearTimeout(timer);
  }
  const elapsed = Date.now() - t0;

  if (error) {
    const failure = {
      url: args.url,
      ua,
      error,
      fetchedAt: new Date().toISOString(),
      durationMs: elapsed,
      fromCache: false,
    };
    writeFileSync(cachePath, JSON.stringify(failure));
    emit(failure, args, cachePath);
    return;
  }

  const headers = Object.fromEntries(res.headers);
  const jsonLd = extractJsonLd(html);
  const meta = extractMetaTags(html);
  const visibleText = extractVisibleText(html);
  const result = {
    url: args.url,
    finalUrl: res.url,
    redirected: res.redirected,
    status: res.status,
    statusText: res.statusText,
    ua,
    headers,
    bytes: html.length,
    durationMs: elapsed,
    fetchedAt: new Date().toISOString(),
    title: extractTitle(html),
    description: extractMeta(html, 'description'),
    canonical: extractCanonical(html),
    hreflangs: extractHreflangs(html),
    headings: extractHeadings(html),
    openGraph: meta.og,
    twitter: meta.twitter,
    jsonLd,
    jsonLdTypes: jsonLd
      .filter((b) => b.valid)
      .flatMap((b) => collectTypes(b.parsed))
      .filter(Boolean),
    visibleText,
    visibleTextChars: visibleText.length,
    html,
    htmlBytes: html.length,
    antiBotSignals: detectAntiBot(html, res.status, headers),
    fromCache: false,
  };

  writeFileSync(cachePath, JSON.stringify(result));
  emit(result, args, cachePath);
}

function collectTypes(node, out = []) {
  if (!node) return out;
  if (Array.isArray(node)) {
    for (const n of node) collectTypes(n, out);
    return out;
  }
  if (typeof node !== 'object') return out;
  if (node['@type']) {
    if (Array.isArray(node['@type'])) out.push(...node['@type']);
    else out.push(node['@type']);
  }
  if (node['@graph']) collectTypes(node['@graph'], out);
  return out;
}

function emit(payload, args, cachePath) {
  if (args.full) {
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
    return;
  }
  const summary = { ...payload };
  delete summary.html;
  if (typeof summary.visibleText === 'string' && summary.visibleText.length > SUMMARY_TEXT_LIMIT) {
    summary.visibleText = summary.visibleText.slice(0, SUMMARY_TEXT_LIMIT);
    summary.visibleTextTruncated = true;
  }
  summary.cachePath = relative(process.cwd(), cachePath) || cachePath;
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
}

main().catch((e) => {
  console.error(e.stack ?? e.message);
  process.exit(2);
});
