import { z } from "zod";

export const reminderParamsSchema = z.object({
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
});

export type ReminderParamsInput = z.infer<typeof reminderParamsSchema>;
