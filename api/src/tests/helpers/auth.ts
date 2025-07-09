import { AccountType, UserRole } from "@prisma/client";
import { prisma } from "../../utils/db";
import { testEmail } from "./common";

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

export const createUser = async ({
  email = testEmail,
  name = "Test User",
  accountType = AccountType.FREEMIUM,
  role = UserRole.PATIENT,
}) => {
  return await prisma.user.create({
    data: {
      email,
      name,
      accountType,
      role,
    },
  });
};
