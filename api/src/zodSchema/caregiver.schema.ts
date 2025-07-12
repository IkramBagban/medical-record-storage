import { z } from "zod";

export const caregiverRequestSchema = z.object({
  email: z.string().email(),
  message: z.string().optional(),
});

export const approveCaregiverSchema = z.object({
  requestId: z.string(),
  status: z.enum(["APPROVED", "REJECTED"]),
});
