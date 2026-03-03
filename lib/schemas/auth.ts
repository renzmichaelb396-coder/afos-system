/**
 * Zod v4 uses { error: "..." } instead of { required_error: "..." }
 */
import { z } from "zod";

/**
 * Password policy schema — enforces enterprise password rules.
 * Mirrors lib/password-policy.ts for consistent server-side validation.
 */
const passwordPolicySchema = z
  .string({ error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password too long")
  .refine((p) => /[A-Z]/.test(p), "Password must contain at least 1 uppercase letter")
  .refine((p) => /[0-9]/.test(p), "Password must contain at least 1 number")
  .refine((p) => /[^A-Za-z0-9]/.test(p), "Password must contain at least 1 special character");

export const loginSchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .trim()
    .email("Must be a valid email address")
    .max(254, "Email too long"),
  password: z
    .string({ error: "Password is required" })
    .min(1, "Password is required")
    .max(128, "Password too long"),
});

export const registerSchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .trim()
    .email("Must be a valid email address")
    .max(254, "Email too long"),
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
