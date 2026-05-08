#!/usr/bin/env node
// sync-references.mjs — maintainer tool. Propagates `shared/` assets into each
// skill folder so single-skill installs (`npx skills add <repo>/<skill>`) ship
// with everything they need.
//
// Run from repo root:  node shared/scripts/sync-references.mjs

import { existsSync, mkdirSync, readFileSync, copyFileSync } from 'node:fs';
import { dirname, join, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));    // shared/scripts
const SHARED = dirname(HERE);                             // shared
const REPO = dirname(SHARED);                             // repo root

const BASE_SCRIPTS = [
  'audit-fetch.mjs',
  'audit-robots.mjs',
  'audit-sitemap.mjs',
  'audit-uatest.mjs',
];

const REFERENCES = [
  {
    from: 'audit-engine.md',
    relTo: 'references/audit-engine.md',
    skills: [
      'about-audit', 'agent-page', 'case-study-audit', 'comparison-audit',
      'competitor-audit', 'faq-audit', 'features-audit', 'full-audit',
      'homepage-audit', 'pricing-audit',
    ],
  },
  {
    from: 'buyer-context.spec.md',
    relTo: 'references/buyer-context.spec.md',
    skills: ['buyer-context'],
  },
  {
    from: 'ai-bots.md',
    relTo: 'references/ai-bots.md',
    skills: ['crawler-audit'],
  },
];

const SCRIPT_TARGETS = [
  ['homepage-audit', BASE_SCRIPTS],
  ['pricing-audit', BASE_SCRIPTS],
  ['about-audit', BASE_SCRIPTS],
  ['comparison-audit', BASE_SCRIPTS],
  ['features-audit', BASE_SCRIPTS],
  ['case-study-audit', BASE_SCRIPTS],
  ['faq-audit', BASE_SCRIPTS],
  ['agent-page', BASE_SCRIPTS],
  ['buyer-context', BASE_SCRIPTS],
  ['crawler-audit', BASE_SCRIPTS],
  ['full-audit', BASE_SCRIPTS],
  ['competitor-audit', [...BASE_SCRIPTS, 'audit-find-competitors.mjs']],
];

let copied = 0;
let skipped = 0;

function copyIfChanged(src, dst) {
  if (!existsSync(src)) {
    console.error(`  ! missing source: ${relative(REPO, src)}`);
    return;
  }
  const dstDir = dirname(dst);
  if (!existsSync(dstDir)) mkdirSync(dstDir, { recursive: true });
  if (existsSync(dst) && readFileSync(src).equals(readFileSync(dst))) {
    skipped++;
    return;
  }
  copyFileSync(src, dst);
  copied++;
  console.log(`  + ${relative(REPO, dst)}`);
}

console.log('# References');
for (const ref of REFERENCES) {
  const src = join(SHARED, ref.from);
  for (const skill of ref.skills) copyIfChanged(src, join(REPO, skill, ref.relTo));
}

console.log('# Scripts');
for (const [skill, scripts] of SCRIPT_TARGETS) {
  for (const s of scripts) {
    copyIfChanged(join(SHARED, 'scripts', s), join(REPO, skill, 'scripts', s));
  }
}

console.log(`\nDone. ${copied} copied, ${skipped} unchanged.`);
