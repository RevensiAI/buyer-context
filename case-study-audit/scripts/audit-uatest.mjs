#!/usr/bin/env node
// audit-uatest.mjs — fetch the same URL with multiple User-Agents and compare.
//
// Detects anti-bot/UA filtering: if browser-UA gets full HTML and GPTBot gets a
// 403/Cloudflare wall/much smaller body, the site is gating AI crawlers.
//
// Usage: node audit-uatest.mjs <url>
//                              [--uas=browser,gptbot,curl]   default

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

function fetchAs(url, ua, passthrough) {
  const r = spawnSync(
    process.execPath,
    [join(HERE, 'audit-fetch.mjs'), url, `--ua=${ua}`, ...passthrough],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  if (r.status !== 0) throw new Error(r.stderr || `audit-fetch exited ${r.status}`);
  return JSON.parse(r.stdout);
}

function main() {
  const argv = process.argv.slice(2);
  let url = null;
  let uas = ['browser', 'gptbot', 'curl'];
  const passthrough = [];
  for (const a of argv) {
    if (a.startsWith('--uas=')) uas = a.slice(6).split(',').map((s) => s.trim()).filter(Boolean);
    else if (a.startsWith('--')) passthrough.push(a);
    else if (!url) url = a;
  }
  if (!url) {
    console.error('Usage: audit-uatest <url> [--uas=ua1,ua2,...]');
    process.exit(1);
  }

  const results = [];
  for (const ua of uas) {
    try {
      const r = fetchAs(url, ua, passthrough);
      results.push({
        ua,
        status: r.status,
        bytes: r.bytes,
        durationMs: r.durationMs,
        title: r.title,
        antiBotSignals: r.antiBotSignals ?? [],
        finalUrl: r.finalUrl,
        error: r.error,
      });
    } catch (e) {
      results.push({ ua, error: e.message });
    }
  }

  const baseline = results[0];
  const summary = results.map((r) => ({
    ua: r.ua,
    status: r.status,
    bytes: r.bytes,
    deltaBytes: baseline?.bytes != null && r.bytes != null ? r.bytes - baseline.bytes : null,
    titleMatch: baseline ? r.title === baseline.title : null,
    antiBotSignals: r.antiBotSignals ?? [],
    error: r.error,
  }));

  const blocked = summary
    .filter((s) => (s.status && s.status >= 400) || (s.antiBotSignals && s.antiBotSignals.length))
    .map((s) => s.ua);

  process.stdout.write(JSON.stringify({ url, uas, results: summary, blocked }, null, 2) + '\n');
}

main();
