/**
 * Zod v4 uses { error: "..." } instead of { required_error: "..." }
 */
import { z } from "zod";

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
  password: z
    .string({ error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
