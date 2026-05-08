#!/usr/bin/env node
// audit-find-competitors.mjs — Brave Search competitor discovery.
//
// Usage: node audit-find-competitors.mjs <company-or-domain> [count]
// Env:   BRAVE_API_KEY (required) — get one at https://brave.com/search/api/

const [target, count = '5'] = process.argv.slice(2);

if (!target) {
  console.error('Usage: audit-find-competitors <company-or-domain> [count]');
  process.exit(1);
}

const apiKey = process.env.BRAVE_API_KEY;
if (!apiKey) {
  console.error('Error: BRAVE_API_KEY is not set.');
  console.error('Get a free key at https://brave.com/search/api/, then export BRAVE_API_KEY=...');
  process.exit(2);
}

const cleanName = target
  .replace(/^https?:\/\//, '')
  .replace(/\/.*/, '')
  .replace(/^www\./, '');

const query = `top competitors to ${cleanName} alternatives`;
const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`;

const res = await fetch(url, {
  headers: {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip',
    'X-Subscription-Token': apiKey,
  },
});

if (!res.ok) {
  console.error(`Error: Brave Search API returned HTTP ${res.status}`);
  console.error(await res.text());
  process.exit(3);
}

const data = await res.json();
const results = (data.web?.results ?? []).map((r) => ({
  title: r.title ?? '',
  url: r.url ?? '',
  description: (r.description ?? '').slice(0, 240),
}));

process.stdout.write(JSON.stringify({ query, target: cleanName, count: results.length, results }, null, 2) + '\n');
