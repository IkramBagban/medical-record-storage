import { Request } from "express";
import { User } from "@prisma/client";

export interface ExtendedRequest extends Request {
  user?: User;
}

export enum RedisKeysPrefix {
  OTP = "otp",
  OTP_LIMIT = "otp:limit",
  OTP_VERIFY = "otp:verify",

  RECORD = "record",
  RECORDS_LIST = "records",

  CAREGIVER_REQUEST_LIST = "caregiver_requests",
}

export const CACHE_TTL = {
  RECORD: 900,
  RECORDS_LIST: 900, 
  CAREGIVER_ACCESS: 900, 
};