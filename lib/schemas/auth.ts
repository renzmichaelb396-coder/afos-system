/**
 * Zod v4 uses { error: "..." } instead of { required_error: "..." }
 */
import { z } from "zod";

/**
 * Password policy schema — enforces enterprise password rules.
 * Mirrors lib/password-policy.ts for consistent server-side validation.
 *
 * Requirements:
 *   - 8–128 characters
 *   - At least 1 uppercase letter (A-Z)
 *   - At least 1 lowercase letter (a-z)
 *   - At least 1 digit (0-9)
 *   - At least 1 special character (!@#$%^&* etc.)
 *   - No leading or trailing whitespace
 */
const passwordPolicySchema = z
  .string({ error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be 128 characters or fewer")
  .refine((p) => !/^\s|\s$/.test(p), "Password must not start or end with whitespace")
  .refine((p) => /[A-Z]/.test(p), "Password must contain at least 1 uppercase letter")
  .refine((p) => /[a-z]/.test(p), "Password must contain at least 1 lowercase letter")
  .refine((p) => /[0-9]/.test(p), "Password must contain at least 1 number")
  .refine((p) => /[^A-Za-z0-9]/.test(p), "Password must contain at least 1 special character");

export const loginSchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Must be a valid email address")
    .max(254, "Email must be 254 characters or fewer"),
  password: z
    .string({ error: "Password is required" })
    .min(1, "Password is required")
    .max(128, "Password must be 128 characters or fewer"),
});

export const registerSchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Must be a valid email address")
    .max(254, "Email must be 254 characters or fewer"),
  password: passwordPolicySchema,
});

/** Schema for admin-initiated password reset (same policy as register). */
export const resetPasswordSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  newPassword: passwordPolicySchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
