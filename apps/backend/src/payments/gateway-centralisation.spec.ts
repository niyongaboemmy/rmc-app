import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Every online payment goes through `PaymentGatewayService`.
 *
 * The point of the port is that switching or adding a provider is a settings
 * change, not a code change. That only holds while nothing reaches around it —
 * and the settings test panel did exactly that for a while, injecting
 * `IremboPayProvider` and calling `charge()` on it directly, which meant the
 * one screen an admin uses to verify payments was the one screen not exercising
 * the real path.
 *
 * This is a structural guard: it fails if any new caller does the same.
 */
const SRC = join(__dirname, '..');

/** Files allowed to name a concrete provider — the wiring itself. */
const WIRING = [
  join('payments', 'payment-gateway.service.ts'), // registers it
  join('payments', 'payments.module.ts'), // provides it
  join('payments', 'providers'), // is it
  join('integrations', 'irembo-pay'), // the client it drives
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith('.ts') && !full.endsWith('.spec.ts') ? [full] : [];
  });
}

describe('payment gateway centralisation', () => {
  const files = walk(SRC);

  it('finds the source tree', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('routes every charge through the gateway, never a provider directly', () => {
    const offenders = files
      .filter((f) => !WIRING.some((allowed) => f.includes(allowed)))
      .filter((f) => /\bIremboPayProvider\b/.test(readFileSync(f, 'utf8')))
      .map((f) => f.replace(SRC, 'src'));

    expect(offenders).toEqual([]);
  });

  it('keeps a single registered provider set behind the port', () => {
    const service = readFileSync(join(SRC, 'payments', 'payment-gateway.service.ts'), 'utf8');

    // `register()` is the only way a provider joins the map, so the router
    // stays the one place that knows which gateways exist.
    expect(service).toContain('register(provider: PaymentGatewayProvider)');
    expect(service).toMatch(/this\.register\(/);
  });

  it('confines the inactive-method bypass to the settings test panel', () => {
    const users = files
      .filter((f) => /allowInactive/.test(readFileSync(f, 'utf8')))
      .map((f) => f.replace(SRC, 'src'));

    // Anything else reaching for it would be taking money through a method an
    // admin has deliberately switched off.
    expect(users.sort()).toEqual(
      [
        join('src', 'payments', 'irembopay-admin.controller.ts'),
        join('src', 'payments', 'payment-gateway.service.ts'),
      ].sort(),
    );
  });
});
