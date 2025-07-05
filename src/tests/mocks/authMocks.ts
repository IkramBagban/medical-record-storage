// src/tests/mocks/authMocks.ts
import { testOtp } from "../common";

export const mockSendGrid = () => {
  jest.mock("@sendgrid/mail", () => ({
    setApiKey: jest.fn(),
    send: jest.fn().mockResolvedValue([{ statusCode: 202 }]),
  }));
};

export const mockEmailService = () => {
  jest.mock("../../services/email/email", () => ({
    emailService: {
      sendOtpEmail: jest.fn().mockResolvedValue(true),
    },
  }));
};

export const mockOtpService = () => {
  jest.mock("../../services/otp", () => ({
    otpService: {
      generateOtp: jest.fn(() => ({
        otp: testOtp,
        expirationTime: new Date(Date.now() + 10 * 60 * 1000),
      })),
      verifyOtp: jest.fn((inputOtp, storedOtp) => inputOtp === storedOtp),
    },
  }));
};

export const setupAuthMocks = () => {
  mockSendGrid();
  mockEmailService();
  mockOtpService();
};
