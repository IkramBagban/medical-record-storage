import { z } from "zod";

export const generateEmergencySnapshotSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  recordIds: z.array(z.string().min(1)).min(1),
});
