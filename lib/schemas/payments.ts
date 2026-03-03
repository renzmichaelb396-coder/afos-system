import { z } from "zod";

const now = new Date();

export const createPaymentSchema = z.object({
  // clientId may be a string UUID or a numeric ID (legacy tests send integer)
  clientId: z
    .union([
      z.string({ error: "clientId is required" }).trim().min(1, "clientId is required"),
      z.number({ error: "clientId is required" }).int().positive().transform(String),
    ]),
  amount: z
    .union([z.number(), z.string().transform(Number)])
    .refine((v) => Number.isFinite(v) && v > 0, {
      message: "amount must be a positive number",
    }),
  // year and month are optional; default to the current calendar period
  year: z
    .union([z.number(), z.string().transform(Number)])
    .refine((v) => Number.isInteger(v) && v >= 2000 && v <= 3000, {
      message: "year must be an integer between 2000 and 3000",
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
