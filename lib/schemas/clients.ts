import { z } from "zod";

export const createClientSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(200, "Name must be 200 characters or fewer")
    .regex(/\S/, "Name cannot be blank whitespace"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Must be a valid email address")
    .max(254, "Email must be 254 characters or fewer")
    .nullable()
    .optional()
    .transform((v) => (v === "" ? null : (v ?? null))),
  monthlyFee: z
    .union([
      z.number({ error: "monthlyFee is required" }),
      z.string().transform(Number),
    ])
    .refine((v) => Number.isFinite(v) && v > 0, {
      message: "monthlyFee must be a positive number",
    })
    .refine((v) => v <= 10_000_000, {
      message: "monthlyFee must be 10,000,000 or less",
    })
    .transform(Math.trunc),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = z.object({
  clientId: z.string().min(1, "clientId is required"),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(200, "Name must be 200 characters or fewer")
    .regex(/\S/, "Name cannot be blank whitespace")
    .optional(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Must be a valid email address")
    .max(254, "Email must be 254 characters or fewer")
    .nullable()
    .optional()
    .transform((v) => (v === "" ? null : (v ?? null))),
  monthlyFee: z
    .union([
      z.number(),
      z.string().transform(Number),
    ])
    .refine((v) => Number.isFinite(v) && v > 0, {
      message: "monthlyFee must be a positive number",
    })
    .refine((v) => v <= 10_000_000, {
      message: "monthlyFee must be 10,000,000 or less",
    })
    .transform(Math.trunc)
    .optional(),
});

export type UpdateClientInput = z.infer<typeof updateClientSchema>;
