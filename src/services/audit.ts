import {
  AuditLogAction,
  AuditLogStatus,
  AuditLogTargetType,
} from "../generated/prisma";
import { ExtendedRequest } from "../types/common";
import { prisma } from "../utils/db";
import { getClientIp } from "../utils/helper";

interface AuditLogParams {
  req: ExtendedRequest;
  action: AuditLogAction;
  status: AuditLogStatus;
  description?: string;
  targetId?: string;
  targetType?: AuditLogTargetType;
}

export class AuditService {
  private static instance: AuditService;

  private constructor() {}

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  public async logAction({
    req,
    action,
    description,
    targetId,
    targetType,
    status,
  }: AuditLogParams): Promise<void> {
    try {
      const userId = req.user?.id;
      const ipAddress = getClientIp(req);
      console.log("AuditLog payload:", {
        userId,
        action,
        description,
        targetId,
        targetType,
        ipAddress,
        status,
      });

      const auditLog = await prisma.auditLog.create({
        data: {
          userId,
          action,
          description,
          targetId,
          targetType,
          ipAddress,
          status,
        },
      });
      console.log("AuditLog created:", auditLog);
    } catch (error) {
      console.error("Error logging audit action:", error);
    }
  }
}

export const auditService = AuditService.getInstance();
