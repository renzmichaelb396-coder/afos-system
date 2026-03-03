/**
 * lib/password-policy.ts
 *
 * Enterprise password policy enforcement.
 * Rules:
 *   - Minimum 8 characters
 *   - At least 1 uppercase letter (A-Z)
 *   - At least 1 number (0-9)
 *   - At least 1 special character (!@#$%^&*()_+-=[]{}|;':",.<>?/`~\)
 *
 * Used server-side in register and password-reset routes.
 * Also exported for client-side validation feedback.
 */

export type PasswordPolicyResult =
  | { valid: true }
  | { valid: false; errors: string[] };

const RULES = [
  {
    test: (p: string) => p.length >= 8,
    message: "At least 8 characters",
  },
  {
    test: (p: string) => /[A-Z]/.test(p),
    message: "At least 1 uppercase letter",
  },
  {
    test: (p: string) => /[0-9]/.test(p),
    message: "At least 1 number",
  },
  {
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
    message: "At least 1 special character",
  },
];

export function validatePassword(password: string): PasswordPolicyResult {
  const errors = RULES.filter((r) => !r.test(password)).map((r) => r.message);
  if (errors.length === 0) return { valid: true };
  return { valid: false, errors };
}

/** Returns a single human-readable error string for API responses. */
export function passwordPolicyError(password: string): string | null {
  const result = validatePassword(password);
  if (result.valid) return null;
  return `Password must contain: ${result.errors.join(", ")}.`;
}

/** All rule descriptions — useful for rendering a requirements checklist in the UI. */
export const PASSWORD_RULES = RULES.map((r) => r.message);
