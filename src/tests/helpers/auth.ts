import { prisma } from "../../utils/db";
import { testEmail } from "../common";

interface CreateOtpVerificationParams {
  email?: string;
  otp?: string;
  expiresAt?: Date;
  verified?: boolean;
}

export const createOtpVerification = async ({
  email = testEmail,
  otp = "123456",
  expiresAt = new Date(Date.now() + 10 * 60 * 1000),
  verified = false,
}: CreateOtpVerificationParams) => {
  await prisma.otpVerification.create({
    data: {
      email,
      otp,
      expiresAt,
      verified,
    },
  });
};
