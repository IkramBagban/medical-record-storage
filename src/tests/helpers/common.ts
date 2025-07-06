import app from "../..";
import { prisma } from "../../utils/db";
import { createOtpVerification, createUser } from "./auth";
import request from "supertest";

export const testEmail = "ikrambagban.dev@gmail.com";
export const testOtp = "123456";

export const cleanupAuthTables = async () => {
  await prisma.otpVerification.deleteMany();
  await prisma.user.deleteMany();
};

export const cleanupRecordTables = async () => {
  await prisma.record.deleteMany();
  await prisma.caregiverRequest.deleteMany();
};

export const cleanupAllTables = async () => {
  await cleanupAuthTables();
  await cleanupRecordTables();
};

export const createUserAndVerify = async () => {
  await createUser({});
  const res = await createOtpVerification({});
  console.log("OTP verification created:", res);
  return await request(app).post("/api/v1/auth/login/verify").send({
    email: testEmail,
    otp: testOtp,
  });
};
