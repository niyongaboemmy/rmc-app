#!/usr/bin/env node
const { execSync } = require('child_process');
const readline = require('readline');

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
const out = (cmd) => execSync(cmd).toString().trim();

async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

async function main() {
  // Ensure working tree is clean
  const status = out('git status --porcelain');
  if (status) {
    console.error('\nUncommitted changes detected. Commit or stash them first.\n');
    process.exit(1);
  }

  // Ensure we are on main
  const branch = out('git rev-parse --abbrev-ref HEAD');
  if (branch !== 'main') {
    console.error(`\nYou are on branch "${branch}". Switch to main first.\n`);
    process.exit(1);
  }

  run('git pull origin main');

  // Get latest tag
  let latest = 'v0.0.0';
  try { latest = out('git describe --tags --abbrev=0'); } catch {}

  const existingTags = new Set(out('git tag').split('\n').filter(Boolean));

  const [major, minor, patch] = latest.replace('v', '').split('.').map(Number);

  // Auto-skip any already-existing tags
  let patchVer = patch + 1;
  while (existingTags.has(`v${major}.${minor}.${patchVer}`)) patchVer++;

  const versions = {
    patch: `v${major}.${minor}.${patchVer}`,
    minor: `v${major}.${minor + 1}.0`,
    major: `v${major + 1}.0.0`,
  };

  console.log(`\nCurrent version: ${latest}`);
  console.log(`  [1] patch → ${versions.patch}  (bug fixes)`);
  console.log(`  [2] minor → ${versions.minor}  (new features)`);
  console.log(`  [3] major → ${versions.major}  (breaking changes)`);

  const answer = await ask('\nChoose release type [1/2/3]: ');

  const type = answer === '1' ? 'patch' : answer === '2' ? 'minor' : answer === '3' ? 'major' : null;
  if (!type) {
    console.error('Invalid choice. Enter 1, 2, or 3.\n');
    process.exit(1);
  }

  const next = versions[type];
  console.log(`\nDeploying ${latest} → ${next} ...\n`);

  if (existingTags.has(next)) {
    console.error(`\nTag ${next} already exists locally. Delete it first with: git tag -d ${next}\n`);
    process.exit(1);
  }
  run(`git tag ${next}`);
  run(`git push origin ${next}`);

  console.log(`\nTriggering CD pipeline...`);
  run(`gh workflow run cd-production.yml --field confirm=DEPLOY`);

  console.log(`\n✅  Tag ${next} pushed — CD pipeline is running.`);
  console.log(`    https://github.com/niyongaboemmy/rmc-app/actions\n`);
}

main();
