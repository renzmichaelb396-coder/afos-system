import { z } from "zod";

const now = new Date();

export const createPaymentSchema = z.object({
  // clientId must be a non-empty string (CUID/UUID)
  clientId: z
    .union([
      z.string({ error: "clientId is required" }).trim().min(1, "clientId is required"),
      z.number({ error: "clientId is required" }).int().positive().transform(String),
    ]),
  amount: z
    .union([z.number(), z.string().transform(Number)])
    .refine((v) => Number.isFinite(v) && v > 0, {
      message: "amount must be a positive number",
    })
    .refine((v) => v <= 10_000_000, {
      message: "amount must be 10,000,000 or less",
    })
    .refine((v) => Math.round(v * 100) / 100 === v, {
      message: "amount must have at most 2 decimal places",
    }),
  // year and month are optional; default to the current calendar period
  year: z
    .union([z.number(), z.string().transform(Number)])
    .refine((v) => Number.isInteger(v) && v >= 2000 && v <= 2100, {
      message: "year must be an integer between 2000 and 2100",
    })
    .optional()
    .default(now.getFullYear()),
  month: z
    .union([z.number(), z.string().transform(Number)])
    .refine((v) => Number.isInteger(v) && v >= 1 && v <= 12, {
      message: "month must be an integer between 1 and 12",
    })
    .optional()
    .default(now.getMonth() + 1),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
