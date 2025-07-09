import { RedisKeysPrefix } from "../../types/common";
import { throwError } from "../../utils/error";
import { EmailService, emailService } from "../email/email";
import { RedisService, redisService } from "../redis";
import { OtpService, otpService } from "./otp";

export class OtpServiceFacade {
  private static instance: OtpServiceFacade;
  private otpService: OtpService;
  private emailService: EmailService;
  private redisService: RedisService;

  private constructor() {
    this.otpService = otpService;
    this.emailService = emailService;
    this.redisService = redisService;
  }

  static getInstance(): OtpServiceFacade {
    if (!OtpServiceFacade.instance) {
      OtpServiceFacade.instance = new OtpServiceFacade();
    }
    return OtpServiceFacade.instance;
  }
  async sendOtpToEmail(email: string): Promise<void> {
    try {
      const rateLimitKey = `${RedisKeysPrefix.OTP_LIMIT}:${email}`;
      const otpKey = `${RedisKeysPrefix.OTP}:${email}`;
      const MAX_ATTEMPTS = 5;
      const WINDOW_SECONDS = 5 * 60; // 5 minutes

      const attempts = await this.redisService.incr(rateLimitKey);

      if (attempts === 1) {
        await this.redisService.expire(rateLimitKey, WINDOW_SECONDS);
      }

      if (attempts > MAX_ATTEMPTS) {
        throwError("Too many OTP requests. Please wait 5 minutes.", 429);
      }

      await this.redisService.del(otpKey);

      const { otp, hashedOtp } = await this.otpService.generateOtp();
      await this.redisService.set(otpKey, hashedOtp, { EX: 10 * 60 });
      await this.emailService.sendOtpEmail(email, otp);
    } catch (error) {
      console.error("Error sending OTP:", error);
      if (error instanceof Error) throw error;
      throwError("Failed to send OTP. Please try again.", 500);
    }
  }

  async verifyOtp(
    email: string,
    otp: string
  ): Promise<{ isValid: boolean; message: string }> {
    const otpKey = `${RedisKeysPrefix.OTP}:${email}`;
    const verifyKey = `${RedisKeysPrefix.OTP_VERIFY}:${email}`;
    const MAX_ATTEMPTS = 15;
    const BLOCK_WINDOW_SECONDS = 10 * 60; // 10 minutes

    try {
      const attempts = await this.redisService.incr(verifyKey);
      if (attempts === 1) {
        await this.redisService.expire(verifyKey, BLOCK_WINDOW_SECONDS);
      }
      if (attempts > MAX_ATTEMPTS) {
        return {
          isValid: false,
          message: "Too many wrong attempts. Please wait 10 minutes.",
        };
      }

      const hashedOtp = await this.redisService.get(otpKey);
      if (!hashedOtp) {
        return {
          isValid: false,
          message: "Wrong email or OTP expired. Please request a new OTP.",
        };
      }

      const isValid = await this.otpService.verifyOtp(otp, hashedOtp);
      if (isValid) {
        await this.redisService.del(otpKey);
        await this.redisService.del(verifyKey);
      }

      return {
        isValid,
        message: isValid
          ? "OTP verified successfully."
          : "Invalid OTP. Please try again.",
      };
    } catch (error) {
      console.error("Error verifying OTP:", error);
      return { isValid: false, message: "Failed to verify OTP." };
    }
  }
}

export const otpFacade = OtpServiceFacade.getInstance();
