import { prisma } from "../utils/db";

export const testEmail = "ikrambagban.dev@gmail.com";
export const testOtp = "123456";

export const cleanupTestData = async () => {
  await prisma.otpVerification.deleteMany({ where: { email: testEmail } });
  await prisma.user.deleteMany({ where: { email: testEmail } });
};
