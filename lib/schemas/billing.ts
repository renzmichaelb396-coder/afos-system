import { z } from "zod";

const yearMonth = {
  year: z
    .union([z.number(), z.string().transform(Number)])
    .refine((v) => Number.isInteger(v) && v >= 2000 && v <= 3000, {
      message: "year must be an integer between 2000 and 3000",
    }),
  month: z
    .union([z.number(), z.string().transform(Number)])
    .refine((v) => Number.isInteger(v) && v >= 1 && v <= 12, {
      message: "month must be an integer between 1 and 12",
    }),
};

export const billingQuerySchema = z.object(yearMonth);
export const closePeriodSchema = z.object(yearMonth);

export type BillingQueryInput = z.infer<typeof billingQuerySchema>;
export type ClosePeriodInput = z.infer<typeof closePeriodSchema>;
