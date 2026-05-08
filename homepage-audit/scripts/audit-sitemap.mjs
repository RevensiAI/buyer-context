#!/usr/bin/env node
// audit-sitemap.mjs — fetch + parse a sitemap.xml or sitemap-index.
//
// Usage: node audit-sitemap.mjs <domain-or-sitemap-url>
//                               [--depth=1]   follow child sitemap-indexes 1 level
//                               [--ua=...]

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

function parseSitemap(xml) {
  const urls = [];
  const reUrl = /<url\b[^>]*>([\s\S]*?)<\/url>/gi;
  let m;
  while ((m = reUrl.exec(xml)) !== null) {
    const block = m[1];
    const loc = block.match(/<loc[^>]*>([\s\S]*?)<\/loc>/i);
    const lastmod = block.match(/<lastmod[^>]*>([\s\S]*?)<\/lastmod>/i);
    if (loc) urls.push({ loc: loc[1].trim(), lastmod: lastmod ? lastmod[1].trim() : null });
  }
  const sitemaps = [];
  const reSm = /<sitemap\b[^>]*>([\s\S]*?)<\/sitemap>/gi;
  while ((m = reSm.exec(xml)) !== null) {
    const block = m[1];
    const loc = block.match(/<loc[^>]*>([\s\S]*?)<\/loc>/i);
    const lastmod = block.match(/<lastmod[^>]*>([\s\S]*?)<\/lastmod>/i);
    if (loc) sitemaps.push({ loc: loc[1].trim(), lastmod: lastmod ? lastmod[1].trim() : null });
  }
  return { urls, sitemaps };
}

function normalize(input) {
  let url = input.trim();
  if (!/^https?:\/\//.test(url)) url = `https://${url}`;
  if (!/sitemap.*\.xml/i.test(url)) {
    const u = new URL(url);
    return `${u.protocol}//${u.host}/sitemap.xml`;
  }
  return url;
}

function fetchOnce(url, passthrough) {
  const fetchScript = join(HERE, 'audit-fetch.mjs');
  const r = spawnSync(process.execPath, [fetchScript, url, '--full', ...passthrough], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(r.stderr || `audit-fetch exited ${r.status}`);
  return JSON.parse(r.stdout);
}

function ageDays(d) {
  if (!d) return null;
  return Math.round((Date.now() - new Date(d).getTime()) / 86400000);
}

function main() {
  const argv = process.argv.slice(2);
  let target = null;
  let depth = 1;
  const passthrough = [];
  for (const a of argv) {
    if (a.startsWith('--depth=')) depth = parseInt(a.slice(8), 10);
    else if (a.startsWith('--')) passthrough.push(a);
    else if (!target) target = a;
  }
  if (!target) {
    console.error('Usage: audit-sitemap <domain-or-sitemap-url> [--depth=1] [--ua=...]');
    process.exit(1);
  }
  const url = normalize(target);
  let fetched;
  try {
    fetched = fetchOnce(url, passthrough);
  } catch (e) {
    process.stdout.write(JSON.stringify({ url, error: e.message, urls: [], childSitemaps: [] }, null, 2) + '\n');
    return;
  }
  if (fetched.error || (fetched.status && fetched.status >= 400)) {
    process.stdout.write(JSON.stringify({ url, status: fetched.status, error: fetched.error ?? `HTTP ${fetched.status}`, urls: [], childSitemaps: [] }, null, 2) + '\n');
    return;
  }
  const xml = fetched.html ?? '';
  const parsed = parseSitemap(xml);
  const childResults = [];
  if (parsed.sitemaps.length && depth > 0) {
    for (const child of parsed.sitemaps.slice(0, 10)) {
      try {
        const cf = fetchOnce(child.loc, passthrough);
        const cp = parseSitemap(cf.html ?? '');
        childResults.push({ url: child.loc, lastmod: child.lastmod, urlCount: cp.urls.length });
      } catch (e) {
        childResults.push({ url: child.loc, error: e.message });
      }
    }
  }
  const lastmods = parsed.urls.map((u) => u.lastmod).filter(Boolean).sort();
  const newest = lastmods[lastmods.length - 1] ?? null;
  const oldest = lastmods[0] ?? null;

  const out = {
    url,
    finalUrl: fetched.finalUrl,
    status: fetched.status,
    fetchedAt: fetched.fetchedAt,
    isIndex: parsed.sitemaps.length > 0 && parsed.urls.length === 0,
    urlCount: parsed.urls.length,
    childSitemapCount: parsed.sitemaps.length,
    newestLastmod: newest,
    oldestLastmod: oldest,
    newestAgeDays: ageDays(newest),
    oldestAgeDays: ageDays(oldest),
    sample: parsed.urls.slice(0, 30),
    childSitemaps: childResults,
  };
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

main();
