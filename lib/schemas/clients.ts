import { z } from "zod";

export const createClientSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(200, "Name too long"),
  email: z
    .string()
    .trim()
    .email("Must be a valid email address")
    .max(254, "Email too long")
    .nullable()
    .optional()
    .transform((v) => (v === "" ? null : (v ?? null))),
  monthlyFee: z
    .union([z.number(), z.string().transform(Number)])
    .refine((v) => Number.isFinite(v) && v > 0, {
      message: "monthlyFee must be a positive number",
    })
    .transform(Math.trunc),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
