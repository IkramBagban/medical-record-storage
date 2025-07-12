import request from "supertest";
import app, { server } from "..";
import { prisma } from "../utils/db";
import { cleanupAllTables, testEmail } from "./helpers/common";
import { RedisKeysPrefix } from "../types/common";
import { redisService } from "../services/redis";
import { otpService } from "../services/otp/otp";

beforeAll(async () => {
  await cleanupAllTables();
}, 20000);

afterAll(async () => {
  await cleanupAllTables();
  await prisma.$disconnect();
  server.close();
}, 20000);

beforeEach(async () => {
  await cleanupAllTables();
}, 20000);

const otpKey = `${RedisKeysPrefix.OTP}:${testEmail}`;

describe("Signup OTP Flow", () => {
  describe("POST /api/v1/auth/signup/send-otp", () => {
    it("should send OTP to a new user", async () => {
      await redisService.del(otpKey);
      await redisService.del(`${RedisKeysPrefix.OTP_LIMIT}:${testEmail}`);

      const res = await request(app)
        .post("/api/v1/auth/signup/send-otp")
        .send({ email: testEmail });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "OTP sent to email");

      const otpRecord = await redisService.get(otpKey);
      expect(otpRecord).toBeTruthy();
    }, 10000);

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
    it("should return 400 for missing required fields", async () => {
      const res = await request(app)
        .post("/api/v1/auth/signup/verify")
        .send({ email: testEmail });

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
      const { hashedOtp } = await otpService.generateOtp();
      await redisService.set(otpKey, hashedOtp, { EX: 600 });

      const res = await request(app).post("/api/v1/auth/signup/verify").send({
        name: "Ikram",
        email: testEmail,
        accountType: "FREEMIUM",
        role: "CAREGIVER",
        otp: "000000", // Wrong OTP
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/Invalid OTP/);
    });

    it("should return 400 for expired OTP", async () => {
      await redisService.del(otpKey);

      const res = await request(app).post("/api/v1/auth/signup/verify").send({
        name: "Ikram",
        email: testEmail,
        accountType: "FREEMIUM",
        role: "CAREGIVER",
        otp: "123456",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/expired/i);
    });

    it("should verify OTP and create user successfully", async () => {
      const { otp, hashedOtp } = await otpService.generateOtp();
      await redisService.set(otpKey, hashedOtp, { EX: 600 });

      const res = await request(app).post("/api/v1/auth/signup/verify").send({
        name: "Ikram",
        email: testEmail,
        accountType: "FREEMIUM",
        role: "CAREGIVER",
        otp,
      });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "User created successfully");

      const user = await prisma.user.findUnique({
        where: { email: testEmail },
      });
      expect(user).toBeTruthy();
      expect(user?.name).toBe("Ikram");
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
      expect(res.body.error).toMatch(/Email already in use/);
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

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "OTP sent to email");

      const otpRecord = await redisService.get(otpKey);
      expect(otpRecord).toBeTruthy();
    }, 10000);

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
    it("should login user with valid OTP", async () => {
      const { otp, hashedOtp } = await otpService.generateOtp();
      await redisService.set(otpKey, hashedOtp, { EX: 600 });

      const res = await request(app).post("/api/v1/auth/login/verify").send({
        email: testEmail,
        otp,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Logged in successfully");
    });

    it("should return 400 for invalid OTP", async () => {
      const { hashedOtp } = await otpService.generateOtp();
      await redisService.set(otpKey, hashedOtp, { EX: 600 });

      const res = await request(app).post("/api/v1/auth/login/verify").send({
        email: testEmail,
        otp: "000000",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/Invalid OTP/);
    });

    it("should return 400 for expired OTP", async () => {
      await redisService.del(otpKey);

      const res = await request(app).post("/api/v1/auth/login/verify").send({
        email: testEmail,
        otp: "123456",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/expired|not found/i);
    });

    it("should return 400 for missing OTP", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login/verify")
        .send({ email: testEmail });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
  });
});
