import { z } from "zod";

const yearField = z
  .union([z.number(), z.string().transform(Number)])
  .refine((v) => Number.isInteger(v) && v >= 2000 && v <= 2100, {
    message: "year must be an integer between 2000 and 2100",
  });

const monthField = z
  .union([z.number(), z.string().transform(Number)])
  .refine((v) => Number.isInteger(v) && v >= 1 && v <= 12, {
    message: "month must be an integer between 1 and 12",
  });

export const billingQuerySchema = z.object({
  year: yearField,
  month: monthField,
});

export const closePeriodSchema = z.object({
  year: yearField,
  month: monthField,
});

export type BillingQueryInput = z.infer<typeof billingQuerySchema>;
export type ClosePeriodInput = z.infer<typeof closePeriodSchema>;
