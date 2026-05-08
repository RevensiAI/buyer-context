#!/usr/bin/env node
// audit-robots.mjs — fetch + parse robots.txt against the AI-bot panel.
//
// Usage: node audit-robots.mjs <domain-or-url>
//                              [--path=/]   path to evaluate (default '/')
//                              [--ua=...]
//
// Output: JSON with bot allow/disallow status, sitemaps, crawl-delays.

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const AI_BOTS = [
  { name: 'GPTBot', operator: 'OpenAI' },
  { name: 'ChatGPT-User', operator: 'OpenAI' },
  { name: 'OAI-SearchBot', operator: 'OpenAI' },
  { name: 'ClaudeBot', operator: 'Anthropic' },
  { name: 'Claude-User', operator: 'Anthropic' },
  { name: 'Claude-SearchBot', operator: 'Anthropic' },
  { name: 'anthropic-ai', operator: 'Anthropic' },
  { name: 'PerplexityBot', operator: 'Perplexity' },
  { name: 'Perplexity-User', operator: 'Perplexity' },
  { name: 'Google-Extended', operator: 'Google' },
  { name: 'Applebot-Extended', operator: 'Apple' },
  { name: 'CCBot', operator: 'Common Crawl' },
  { name: 'cohere-ai', operator: 'Cohere' },
  { name: 'Bytespider', operator: 'ByteDance' },
  { name: 'Meta-ExternalAgent', operator: 'Meta' },
  { name: 'FacebookBot', operator: 'Meta' },
  { name: 'Diffbot', operator: 'Diffbot' },
  { name: 'omgili', operator: 'Webz.io' },
];

function normalizeRobotsUrl(input) {
  let url = input.trim();
  if (!/^https?:\/\//.test(url)) url = `https://${url}`;
  const u = new URL(url);
  return `${u.protocol}//${u.host}/robots.txt`;
}

// Group consecutive User-agent lines into one block. Allow/Disallow/Crawl-delay
// after a UA group apply to that group until the next UA line.
function parseRobots(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  const sitemaps = [];
  let cur = null;
  let lastWasUA = false;

  for (const raw of lines) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === 'sitemap') {
      sitemaps.push(value);
      continue;
    }
    if (field === 'user-agent') {
      if (!lastWasUA || !cur) {
        cur = { uas: [], rules: [], crawlDelay: null };
        blocks.push(cur);
      }
      cur.uas.push(value);
      lastWasUA = true;
      continue;
    }
    lastWasUA = false;
    if (!cur) continue;
    if (field === 'allow') cur.rules.push({ op: 'allow', path: value });
    else if (field === 'disallow') cur.rules.push({ op: 'disallow', path: value });
    else if (field === 'crawl-delay') cur.crawlDelay = parseFloat(value);
  }
  return { blocks, sitemaps };
}

// Longest-match path rule wins; explicit empty Disallow means "allow everything".
function evaluateBot(botName, blocks, path = '/') {
  const lower = botName.toLowerCase();
  const exact = blocks.find((b) => b.uas.some((ua) => ua.toLowerCase() === lower));
  const wildcard = blocks.find((b) => b.uas.includes('*'));
  const block = exact || wildcard;
  if (!block) return { status: 'allowed', source: 'no-rule' };

  let best = null;
  for (const r of block.rules) {
    if (r.path === '' || path.startsWith(r.path)) {
      if (!best || r.path.length > best.path.length) best = r;
    }
  }
  if (!best) return { status: 'allowed', source: exact ? 'explicit-block-no-rule' : 'wildcard-block-no-rule' };
  if (best.op === 'allow') return { status: 'allowed', source: exact ? 'explicit-allow' : 'implicit-allow', rule: best.path };
  if (best.path === '') return { status: 'allowed', source: exact ? 'explicit-empty-disallow' : 'implicit-empty-disallow' };
  return { status: 'disallowed', source: exact ? 'explicit-disallow' : 'implicit-disallow', rule: best.path };
}

function main() {
  const argv = process.argv.slice(2);
  let target = null;
  let path = '/';
  const passthrough = [];
  for (const a of argv) {
    if (a.startsWith('--path=')) path = a.slice(7);
    else if (a.startsWith('--')) passthrough.push(a);
    else if (!target) target = a;
  }
  if (!target) {
    console.error('Usage: audit-robots <domain-or-url> [--path=/] [--ua=...]');
    process.exit(1);
  }
  const url = normalizeRobotsUrl(target);
  const fetchScript = join(HERE, 'audit-fetch.mjs');
  const r = spawnSync(process.execPath, [fetchScript, url, '--full', ...passthrough], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (r.status !== 0) {
    console.error(r.stderr);
    process.exit(r.status ?? 2);
  }
  const fetched = JSON.parse(r.stdout);
  const text = fetched.html ?? '';
  const present = fetched.status === 200 && text.length > 0;
  const { blocks, sitemaps } = parseRobots(text);
  const bots = AI_BOTS.map((b) => ({ ...b, ...evaluateBot(b.name, blocks, path) }));

  const out = {
    robotsUrl: url,
    finalUrl: fetched.finalUrl,
    status: fetched.status,
    fetchedAt: fetched.fetchedAt,
    present,
    sitemaps,
    crawlDelays: Object.fromEntries(
      blocks.filter((b) => b.crawlDelay != null).flatMap((b) => b.uas.map((ua) => [ua, b.crawlDelay])),
    ),
    bots,
    blocks: blocks.map((b) => ({ uas: b.uas, ruleCount: b.rules.length, crawlDelay: b.crawlDelay })),
    raw: text.length < 8000 ? text : text.slice(0, 8000) + '\n...[truncated]',
  };
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

main();
