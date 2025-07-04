import bcrypt from "bcryptjs";

class OtpService {
  static instance: OtpService;
  private constructor() {}

  static getInstance(): OtpService {
    if (!OtpService.instance) {
      OtpService.instance = new OtpService();
    }
    return OtpService.instance;
  }

  generateOtp(length: number = 6): {
    otp: string;
    expirationTime: Date;
  } {
    const otp = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, "0");
    const expirationTime = new Date(Date.now() + 10 * 60 * 1000);
    // const hashedOtp = this.hashOtp(otp);
    return { otp, expirationTime };
  }

  async hashOtp(otp: string): Promise<string> {
    if (!otp || otp.length !== 6) {
      throw new Error("Invalid OTP format");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);
    return hashedOtp;
  }

  async verifyOtp(inputOtp: string, storedHashedOtp: string): Promise<boolean> {
    if (!inputOtp || inputOtp.length !== 6) {
      throw new Error("Invalid OTP format");
    }
    const isMatch = inputOtp === storedHashedOtp;
    return isMatch;
  }
}

export const otpService = OtpService.getInstance();
