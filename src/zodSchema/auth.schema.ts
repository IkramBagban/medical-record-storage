import z from "zod";

export const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email("Invalid email format"),
  accountType: z.enum(["FREEMIUM", "PREMIUM"]),
  role: z.enum(["PATIENT", "CAREGIVER", "DEPENDENT"]),
  otp: z.string().length(6, "OTP must be exactly 6 characters"),
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});
