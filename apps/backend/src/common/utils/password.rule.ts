/**
 * The one password rule, shared by register / reset / change.
 *
 * Two problems this replaces:
 *
 * 1. The old pattern whitelisted which symbols counted — `[A-Za-z\d@$!%*?&\-_#]`
 *    — and rejected every other character. A password containing `+`, `(` or `~`
 *    is stronger, not weaker, yet it failed here while the frontend (which only
 *    ever checked the four lookaheads) had already accepted it. The user saw a
 *    server error listing rules their password visibly satisfied. Requiring a
 *    symbol is reasonable; dictating which symbols only refuses entropy.
 *
 * 2. `ChangePasswordDto` enforced nothing but `MinLength(8)`, so the complexity
 *    rule guarded the front door and left the side door open — a user could
 *    register with a strong password and immediately change it to `aaaaaaaa`.
 *
 * Whitespace stays excluded: it survives copy-paste, form autofill and password
 * managers inconsistently, and a silently-trimmed password locks people out of
 * their own account with no way to discover why.
 *
 * The 50-character ceiling matches the DTO's own MaxLength and sits far below
 * bcrypt's 72-byte truncation point, so no accepted password is silently cut.
 */
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s])\S{8,50}$/;

export const PASSWORD_MESSAGE =
  'Password must be 8–50 characters with no spaces, and include an uppercase letter, ' +
  'a lowercase letter, a number and a symbol';
