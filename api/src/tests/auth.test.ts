import request from "supertest";
import app, { server } from "..";
import { prisma } from "../utils/db";
import { cleanupAuthTables, testEmail } from "./helpers/common";
import { createOtpVerification } from "./helpers/auth";

beforeAll(async () => {
  await cleanupAuthTables();
});

afterAll(async () => {
  await cleanupAuthTables();
  await prisma.$disconnect();
  server.close();
});

beforeEach(async () => {
  await cleanupAuthTables();
});

describe("Signup OTP Flow", () => {
  describe("POST /api/v1/auth/signup/send-otp", () => {
    it("should send OTP to a new user", async () => {
      const res = await request(app)
        .post("/api/v1/auth/signup/send-otp")
        .send({ email: testEmail });
      console.log(
        "signup/send-otp Response body: ================================ ",
        res.body,
      );

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "OTP sent to email");

      const otpRecord = await prisma.otpVerification.findFirst({
        where: {
          email: testEmail,
          verified: false,
          expiresAt: { gt: new Date() },
        },
      });
      console.log("otpRecord: ", otpRecord);
      expect(otpRecord).toBeTruthy();
    });

    it("should return 400 for invalid email", async () => {
      const res = await request(app)
        .post("/api/v1/auth/signup/send-otp")
        .send({ email: "invalid-email" });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should return 400 for missing email", async () => {
      const res = await request(app)
        .post("/api/v1/auth/signup/send-otp")
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should resend existing valid OTP if not expired", async () => {
      await createOtpVerification({});

      // await prisma.otpVerification.create({
      //   data: {
      //     email: testEmail,
      //     otp: "123456",
      //     expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      //     verified: false,
      //   },
      // });

      const res = await request(app)
        .post("/api/v1/auth/signup/send-otp")
        .send({ email: testEmail });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty(
        "message",
        "OTP sent to email again. Please check your inbox.",
      );
    });

    it("should return 409 if user already exists", async () => {
      await prisma.user.create({
        data: {
          name: "Test User",
          email: testEmail,
          accountType: "FREEMIUM",
          role: "CAREGIVER",
        },
      });

      const res = await request(app)
        .post("/api/v1/auth/signup/send-otp")
        .send({ email: testEmail });

      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toMatch(/Email already in use/);
    });
  });

  describe("POST /api/v1/auth/signup/verify", () => {
    beforeEach(async () => {
      await createOtpVerification({});
    });

    it("should return 400 for missing required fields", async () => {
      const res = await request(app)
        .post("/api/v1/auth/signup/verify")
        .send({ email: testEmail }); // Missing name, accountType, role, otp

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should return 400 for invalid email format", async () => {
      const res = await request(app).post("/api/v1/auth/signup/verify").send({
        name: "Ikram",
        email: "invalid-email",
        accountType: "FREEMIUM",
        role: "CAREGIVER",
        otp: "123456",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should return 400 for invalid OTP", async () => {
      const res = await request(app).post("/api/v1/auth/signup/verify").send({
        name: "Ikram",
        email: testEmail,
        accountType: "FREEMIUM",
        role: "CAREGIVER",
        otp: "000000", // Wrong OTP
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toMatch(/Invalid OTP/);
    });

    it("should return 400 for expired OTP", async () => {
      await prisma.otpVerification.deleteMany({ where: { email: testEmail } });
      await createOtpVerification({
        expiresAt: new Date(Date.now() - 10 * 60 * 1000),
      });
      const res = await request(app).post("/api/v1/auth/signup/verify").send({
        name: "Ikram",
        email: testEmail,
        accountType: "FREEMIUM",
        role: "CAREGIVER",
        otp: "123456",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toMatch(/Invalid email or expired OTP/);
    });

    it("should return 400 for non-existent email", async () => {
      const res = await request(app).post("/api/v1/auth/signup/verify").send({
        name: "Ikram",
        email: "nonexistent@test.com",
        accountType: "FREEMIUM",
        role: "CAREGIVER",
        otp: "123456",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toMatch(/Invalid email or expired OTP/);
    });

    it("should verify OTP and create user successfully", async () => {
      const res = await request(app).post("/api/v1/auth/signup/verify").send({
        name: "Ikram",
        email: testEmail,
        accountType: "FREEMIUM",
        role: "CAREGIVER",
        otp: "123456",
      });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("token");
      expect(res.body).toHaveProperty("message", "User created successfully");

      const user = await prisma.user.findUnique({
        where: { email: testEmail },
      });
      expect(user).toBeTruthy();
      expect(user?.name).toBe("Ikram");

      const otpRecord = await prisma.otpVerification.findFirst({
        where: { email: testEmail, verified: true },
      });
      expect(otpRecord).toBeTruthy();
    });

    it("should return 409 if user already exists", async () => {
      await prisma.user.create({
        data: {
          name: "Existing User",
          email: testEmail,
          accountType: "FREEMIUM",
          role: "CAREGIVER",
        },
      });

      const res = await request(app).post("/api/v1/auth/signup/verify").send({
        name: "Ikram",
        email: testEmail,
        accountType: "FREEMIUM",
        role: "CAREGIVER",
        otp: "123456",
      });

      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toMatch(/Email already in use/);
    });

    it("should return 400 for already verified OTP", async () => {
      await prisma.otpVerification.updateMany({
        where: { email: testEmail },
        data: { verified: true },
      });

      const res = await request(app).post("/api/v1/auth/signup/verify").send({
        name: "Ikram",
        email: testEmail,
        accountType: "FREEMIUM",
        role: "CAREGIVER",
        otp: "123456",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toMatch(/Invalid email or expired OTP/);
    });
  });
});

describe("Login OTP Flow", () => {
  beforeEach(async () => {
    await prisma.user.create({
      data: {
        name: "Test User",
        email: testEmail,
        accountType: "FREEMIUM",
        role: "CAREGIVER",
      },
    });
  });

  describe("POST /api/v1/auth/login/send-otp", () => {
    it("should send OTP to existing user", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login/send-otp")
        .send({ email: testEmail });

      console.log(
        "login/login send-otp Response body: ================================ ",
        res.body,
      );
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "OTP sent to email");

      const otpRecord = await prisma.otpVerification.findFirst({
        where: { email: testEmail, verified: false },
      });
      expect(otpRecord).toBeTruthy();
    });

    it("should return 404 for non-existent user", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login/send-otp")
        .send({ email: "nonexistent@test.com" });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty("error", "User not found");
    });

    it("should return 400 for invalid email", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login/send-otp")
        .send({ email: "invalid-email" });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("POST /api/v1/auth/login/verify", () => {
    beforeEach(async () => {
      await createOtpVerification({});
    });

    it("should login user with valid OTP", async () => {
      const res = await request(app).post("/api/v1/auth/login/verify").send({
        email: testEmail,
        otp: "123456",
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("token");
      expect(res.body).toHaveProperty("message", "Logged in successfully");

      const otpRecord = await prisma.otpVerification.findFirst({
        where: { email: testEmail, verified: true },
      });
      expect(otpRecord).toBeTruthy();
    });

    it("should return 400 for invalid OTP", async () => {
      const res = await request(app).post("/api/v1/auth/login/verify").send({
        email: testEmail,
        otp: "000000",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error", "Invalid OTP");
    });

    it("should return 410 for expired OTP", async () => {
      await prisma.otpVerification.deleteMany({ where: { email: testEmail } });
      await createOtpVerification({
        expiresAt: new Date(Date.now() - 10 * 60 * 1000),
      });

      const res = await request(app).post("/api/v1/auth/login/verify").send({
        email: testEmail,
        otp: "123456",
      });

      expect(res.statusCode).toBe(410);
      expect(res.body).toHaveProperty("error", "OTP expired or not found");
    });

    it("should return 400 for missing fields", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login/verify")
        .send({ email: testEmail }); // Missing OTP

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
  });
});
