import bcrypt from "bcryptjs";

export class OtpService {
  static instance: OtpService;
  private readonly OTP_LENGTH = 6;
  private constructor() {}

  static getInstance(): OtpService {
    if (!OtpService.instance) {
      OtpService.instance = new OtpService();
    }
    return OtpService.instance;
  }

  async generateOtp(): Promise<{
    otp: string;
    expirationTime: Date;
    hashedOtp: string;
  }> {
    const otp = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(this.OTP_LENGTH, "0");
    const expirationTime = new Date(Date.now() + 10 * 60 * 1000);
    const hashedOtp = await this.hashOtp(otp);
    return { otp, expirationTime, hashedOtp };
  }
  async verifyOtp(otp: string, hashedOtp: string): Promise<boolean> {
    if (!otp || !hashedOtp) {
      throw new Error("OTP or hashed OTP is missing");
    }
    return await bcrypt.compare(otp, hashedOtp);
  }

  async hashOtp(otp: string): Promise<string> {
    if (!otp || otp.length !== this.OTP_LENGTH) {
      throw new Error("Invalid OTP format");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);
    return hashedOtp;
  }
}

export const otpService = OtpService.getInstance();
