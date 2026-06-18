/**
 * One-off: push the translated content defaults into the backend content store
 * (Admin → Content). Run with: npx tsx scripts/seed-content.ts
 *
 * Logs in as an admin, then PUTs each section's translated default so the admin
 * editor + the live pages both show the Kinyarwanda/Arabic content.
 */
import axios from 'axios';
import { ContentKeys } from '../src/lib/content/client';
import { HERO_DEFAULT } from '../src/lib/content/hero';
import { WHO_WE_ARE_DEFAULT } from '../src/lib/content/who-we-are';
import { AREAS_DEFAULT } from '../src/lib/content/areas';
import { STATS_DEFAULT } from '../src/lib/content/stats';
import { PARTNERS_DEFAULT } from '../src/lib/content/partners';
import { UPDATES_DEFAULT } from '../src/lib/content/updates';
import { ACTIVITIES_DEFAULT } from '../src/lib/content/activities';
import { ANNOUNCEMENTS_DEFAULT } from '../src/lib/content/announcements';
import { SOCIAL_DEFAULT } from '../src/lib/content/social';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
// Credentials are read from the environment — never hardcode them:
//   SEED_EMAIL=admin@example.com SEED_PASSWORD=*** npx tsx scripts/seed-content.ts
const IDENTIFIER = process.env.SEED_EMAIL;
const PASSWORD = process.env.SEED_PASSWORD;

if (!IDENTIFIER || !PASSWORD) {
  console.error('✗ Set SEED_EMAIL and SEED_PASSWORD env vars before running.');
  process.exit(2);
}

const SECTIONS: Array<[string, unknown]> = [
  [ContentKeys.hero, HERO_DEFAULT],
  [ContentKeys.whoWeAre, WHO_WE_ARE_DEFAULT],
  [ContentKeys.areas, AREAS_DEFAULT],
  [ContentKeys.stats, STATS_DEFAULT],
  [ContentKeys.partners, PARTNERS_DEFAULT],
  [ContentKeys.updates, UPDATES_DEFAULT],
  [ContentKeys.activities, ACTIVITIES_DEFAULT],
  [ContentKeys.announcements, ANNOUNCEMENTS_DEFAULT],
  [ContentKeys.social, SOCIAL_DEFAULT],
];

function roleFromJwt(token: string): string {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()).role ?? '?';
  } catch {
    return '?';
  }
}

async function main() {
  console.log(`Backend: ${BASE}`);
  let token: string;
  try {
    const res = await axios.post(`${BASE}/auth/login`, { identifier: IDENTIFIER, password: PASSWORD });
    const data = res.data?.data ?? {};
    if (data.requiresMfa) {
      console.error('✗ Login requires an MFA code — re-run with the code wired in. Aborting.');
      process.exit(2);
    }
    token = data.accessToken;
    if (!token) {
      console.error('✗ No access token in login response:', JSON.stringify(res.data));
      process.exit(2);
    }
    console.log(`✓ Logged in as ${IDENTIFIER} (role: ${roleFromJwt(token)})`);
  } catch (e: any) {
    console.error('✗ Login failed:', e.response?.status, e.response?.data?.error?.message ?? e.message);
    process.exit(2);
  }

  let ok = 0;
  for (const [key, value] of SECTIONS) {
    try {
      await axios.put(`${BASE}/content/${key}`, { value }, { headers: { Authorization: `Bearer ${token}` } });
      console.log(`  ✓ seeded ${key}`);
      ok++;
    } catch (e: any) {
      console.error(`  ✗ failed ${key}:`, e.response?.status, e.response?.data?.error?.message ?? e.message);
    }
  }
  console.log(`\nDone: ${ok}/${SECTIONS.length} sections seeded.`);
  process.exit(ok === SECTIONS.length ? 0 : 1);
}

void main();
