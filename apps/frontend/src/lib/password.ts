import { z } from 'zod';

/**
 * The client-side half of the one password rule.
 *
 * Must stay in step with `apps/backend/src/common/utils/password.rule.ts`. The
 * three forms that take a password (register, reset, change) each carried their
 * own regex, and all three checked only the four lookaheads while the server
 * additionally restricted WHICH symbols were legal and capped the length at 50.
 * A password containing `+` — or a 60-character passphrase — therefore passed
 * every visible check and came back as a server error that recited rules the
 * user had met. The server rule no longer whitelists symbols; this one now
 * carries the length bound and the no-whitespace check the server enforces.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Minimum 8 characters')
  .max(50, 'Maximum 50 characters')
  .regex(/^\S+$/, 'Cannot contain spaces')
  .regex(/[a-z]/, 'Must include a lowercase letter')
  .regex(/[A-Z]/, 'Must include an uppercase letter')
  .regex(/\d/, 'Must include a number')
  .regex(/[^A-Za-z\d\s]/, 'Must include a symbol');
