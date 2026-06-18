#!/usr/bin/env node
const { execSync } = require('child_process');

const type = process.argv[2];
if (!['patch', 'minor', 'major'].includes(type)) {
  console.error('Usage: npm run deploy:<patch|minor|major>');
  process.exit(1);
}

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
const out = (cmd) => execSync(cmd).toString().trim();

// Ensure working tree is clean
try {
  const status = out('git status --porcelain');
  if (status) {
    console.error('Uncommitted changes detected. Commit or stash them first.');
    process.exit(1);
  }
} catch {}

// Ensure we are on main and up to date
const branch = out('git rev-parse --abbrev-ref HEAD');
if (branch !== 'main') {
  console.error(`You are on branch "${branch}". Switch to main first.`);
  process.exit(1);
}

run('git pull origin main');

// Get latest tag and bump version
let latest = 'v0.0.0';
try { latest = out('git describe --tags --abbrev=0'); } catch {}

const [major, minor, patch] = latest.replace('v', '').split('.').map(Number);
const next =
  type === 'major' ? `v${major + 1}.0.0` :
  type === 'minor' ? `v${major}.${minor + 1}.0` :
                     `v${major}.${minor}.${patch + 1}`;

console.log(`\n🚀  Deploying ${latest} → ${next}\n`);

run(`git tag ${next}`);
run(`git push origin ${next}`);

console.log(`\n✅  Tag ${next} pushed — CD pipeline is running.`);
console.log(`    https://github.com/niyongaboemmy/rmc-app/actions\n`);
