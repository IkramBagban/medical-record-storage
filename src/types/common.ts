import { Request } from "express";
import { User } from "../generated/prisma";

export interface ExtendedRequest extends Request {
  user?: User;
}

export enum RedisKeysPrefix {
  OTP = "otp:",
  OTP_LIMIT = "otp:limit",
  OTP_VERIFY = "otp:verify",
}
