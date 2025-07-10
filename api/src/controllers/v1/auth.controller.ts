import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { generateToken } from "../../utils/jwt";
import { signupSchema, verifyOtpSchema } from "../../zodSchema/auth.schema";
import { prisma } from "../../utils/db";
import { throwError } from "../../utils/error";
import { auditService } from "../../services/audit";
import {
  AuditLogAction,
  AuditLogStatus,
  AuditLogTargetType,
  PlanLimitStatus,
  SubscriptionStatus,
  User,
} from "@prisma/client";
import { otpFacade } from "../../services/otp/otpFacade";

export const sendSignupOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse(req.body);

    if (!result.success) {
      throwError(JSON.stringify(result.error.flatten()), 400);
      return;
    }

    const { email } = result.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throwError(
        "Email already in use. Please login or use a different email.",
        409
      );
      return;
    }

    await otpFacade.sendOtpToEmail(email);

    await auditService.logAction({
      req,
      action: AuditLogAction.SIGNUP_OTP_SENT,
      status: AuditLogStatus.FAILURE,
      description: "OTP sent",
      targetType: AuditLogTargetType.USER,
      targetId: req.body.email,
    });

    res.status(200).json({
      message: "OTP sent to email",
      success: true,
    });
  } catch (err) {
    await auditService.logAction({
      req,
      action: AuditLogAction.SIGNUP_OTP_SENT,
      status: AuditLogStatus.FAILURE,
      description: err instanceof Error ? err.message : "Signup OTP failed",
      targetType: AuditLogTargetType.USER,
      targetId: req.body.email,
    });
    next(err);
  }
};

export const verifySignup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = signupSchema.safeParse(req.body);
    if (!result.success) {
      throwError(JSON.stringify(result.error.flatten()), 400);
      return;
    }

    const { name, email, accountType, role, otp } = result.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throwError("Email already in use", 409);
      return;
    }

    const { isValid: isOtpValid, message: otpMessage } =
      await otpFacade.verifyOtp(email, otp);
    if (!isOtpValid) {
      throwError(otpMessage, 400);
      return;
    }

    let user: Pick<User, "id" | "email" | "role">;

    user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: { name, email, accountType, role },
        select: {
          id: true,
          email: true,
          role: true,
        },
      });

      await tx.subscription.create({
        data: {
          userId: createdUser.id,
          planType: accountType,
          status: SubscriptionStatus.ACTIVE,
          planLimit: {
            create: {
              totalRecords: 0,
              status: PlanLimitStatus.ACTIVE,
              userId: createdUser.id,
            },
          },
        },
      });

      return createdUser;
    });

    const token = generateToken(user);
    await auditService.logAction({
      req,
      action: AuditLogAction.SIGNUP_VERIFIED,
      status: AuditLogStatus.SUCCESS,
      description: "User created successfully",
      targetType: AuditLogTargetType.USER,
      targetId: user.id,
    });

    res.status(201).json({
      token,
      message: "User created successfully",
      success: true,
    });
  } catch (err) {
    await auditService.logAction({
      req,
      action: AuditLogAction.SIGNUP_VERIFIED,
      status: AuditLogStatus.FAILURE,
      description:
        err instanceof Error ? err.message : "Signup verification failed",
      targetType: AuditLogTargetType.USER,
      targetId: req.body.email,
    });
    next(err);
  }
};

export const sendLoginOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse(req.body);

    if (!result.success) {
      throwError(JSON.stringify(result.error.flatten()), 400);
      return;
    }

    const { email } = result.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throwError("User not found", 404);
      return;
    }

    await otpFacade.sendOtpToEmail(email);
    await auditService.logAction({
      req,
      action: AuditLogAction.LOGIN_OTP_SENT,
      status: AuditLogStatus.SUCCESS,
      description: "OTP sent",
      targetType: AuditLogTargetType.USER,
      targetId: email,
    });

    res.status(200).json({
      message: "OTP sent to email",
      success: true,
    });
  } catch (err) {
    await auditService.logAction({
      req,
      action: AuditLogAction.LOGIN_OTP_SENT,
      status: AuditLogStatus.FAILURE,
      description: err instanceof Error ? err.message : "Send login OTP failed",
      targetType: AuditLogTargetType.USER,
      targetId: req.body.email,
    });
    next(err);
  }
};

export const verifyLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = verifyOtpSchema.safeParse(req.body);
    if (!result.success) {
      throwError(JSON.stringify(result.error.flatten()), 400);
      return;
    }

    const { email, otp } = result.data;

  

    // const isValid = await otpService.verifyOtp(otp, otpRecord.otp);
    const {isValid, message} = await otpFacade.verifyOtp(email, otp);
    if (!isValid) {
      throwError(message, 400);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        accountType: true,
      },
    });

    if (!user) {
      throwError("User not found", 404);
      return;
    }


    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    
    await auditService.logAction({
      req,
      action: AuditLogAction.LOGIN_VERIFIED,
      status: AuditLogStatus.SUCCESS,
      description: "User logged in successfully",
      targetType: AuditLogTargetType.USER,
      targetId: user.id,
    });

    res.status(200).json({
      message: "Logged in successfully",
      token,
      success: true,
    });
  } catch (err) {
    await auditService.logAction({
      req,
      action: AuditLogAction.LOGIN_VERIFIED,
      status: AuditLogStatus.FAILURE,
      description:
        err instanceof Error ? err.message : "Login verification failed",
      targetType: AuditLogTargetType.USER,
      targetId: req.body.email,
    });
    next(err);
  }
};
