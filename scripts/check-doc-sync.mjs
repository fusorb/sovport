#!/usr/bin/env node
// Doc-sync guard.
//
// The narrative docs name dependency versions, and a named version goes stale on
// its own the moment a dependency moves. This asserts that the `x@y.z.w` claims
// in the current-facing docs match package.json; dated audits and ADRs are left
// alone so they stay a record of what was true then.
//
//   node scripts/check-doc-sync.mjs

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

const pkg = JSON.parse(read('package.json'));
const dep = (name) => String(pkg.dependencies?.[name] ?? '').replace(/^[\^~]/, '');

const DOCS = ['README.md', 'docs/sovport-integration-planning.md', 'SYNC.md'];

const CLAIMS = [
  {
    pattern: /@fusorb\/facet-sdk@(\d+\.\d+\.\d+)/g,
    expected: dep('@fusorb/facet-sdk'),
    label: '@fusorb/facet-sdk',
  },
  {
    pattern: /@fusorb\/facet-store@(\d+\.\d+\.\d+)/g,
    expected: dep('@fusorb/facet-store'),
    label: '@fusorb/facet-store',
  },
  {
    pattern: /pnpm@(\d+\.\d+\.\d+)/g,
    expected: String(pkg.packageManager ?? '').replace(/^pnpm@/, ''),
    label: 'pnpm',
  },
];

const problems = [];
for (const file of DOCS) {
  const text = read(file);
  for (const { pattern, expected, label } of CLAIMS) {
    if (!expected) continue;
    for (const [, claimed] of text.matchAll(pattern)) {
      if (claimed !== expected) {
        problems.push(`${file}: ${label} documented as ${claimed}, package.json says ${expected}`);
      }
    }
  }
}

if (problems.length > 0) {
  console.error('doc-sync: version drift between docs and package.json\n');
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('\nUpdate the doc (or the dependency) so they agree.');
  process.exit(1);
}

console.log(`doc-sync: ${DOCS.length} docs match package.json`);
