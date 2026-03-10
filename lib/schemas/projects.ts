import { z } from "zod";

export const projectSchema = z.object({
  clientId: z.string().min(1),
  projectName: z.string().min(2),
  contractAmount: z.coerce.number().int().nonnegative(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]).default("PLANNING"),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
