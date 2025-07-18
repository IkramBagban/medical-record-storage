import { Request, Response, NextFunction } from "express";
import { prisma } from "../../utils/db";
import { throwError } from "../../utils/error";
import { ExtendedRequest } from "../../types/common";
import { s3Service } from "../../services/s3";
import {
  AuditLogAction,
  AuditLogStatus,
  AuditLogTargetType,
} from "@prisma/client";
import { auditService } from "../../services/audit";
import { generateEmergencySnapshotSchema } from "../../zodSchema/emergency.schema";
import { v4 as uuidv4 } from "uuid";

export const getEmergencyData = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { qrToken } = req.params;

    const snapshot = await prisma.emergencySnapshot.findUnique({
      where: { qrToken },
      include: {
        records: {
          include: {
            record: true,
          },
        },
      },
    });

    if (!snapshot) {
      return throwError("Invalid QR token", 404);
    }

    const records = snapshot.records
      .filter((r) => r.record && !r.record.isDeleted)
      .map((r) => r.record);

    await auditService.logAction({
      req,
      action: AuditLogAction.EMERGENCY_SNAPSHOT_VIEWED,
      status: AuditLogStatus.SUCCESS,
      description: `Emergency snapshot accessed`,
      targetType: AuditLogTargetType.EMERGENCY,
    });

    res.status(200).json({
      message: "Emergency snapshot retrieved",
      emergencyData: {
        title: snapshot.title,
        description: snapshot.description,
        records: records.map((r) => ({
          title: r.title,
          type: r.type,
          language: r.language,
          recordDate: r.recordDate,
          downloadUrl: s3Service.getDownloadUrl(r.fileKey),
        })),
      },
    });
  } catch (err) {
    await auditService.logAction({
      req,
      action: AuditLogAction.EMERGENCY_SNAPSHOT_VIEWED,
      status: AuditLogStatus.FAILURE,
      description:
        err instanceof Error ? err.message : "Emergency snapshot access failed",
      targetType: AuditLogTargetType.EMERGENCY,
    });
    next(err);
  }
};

export const generateEmergencySnapshot = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = generateEmergencySnapshotSchema.safeParse(req.body);
    if (!result.success) {
      throwError(JSON.stringify(result.error.flatten()), 400);
      return;
    }

    const { title, description, recordIds } = result.data;
    const userId = req.user!.id;

    const ownedRecords = await prisma.record.findMany({
      where: {
        id: { in: recordIds },
        ownerId: userId,
        isDeleted: false,
      },
      select: { id: true },
    });

    const ownedIds = ownedRecords.map((r) => r.id);
    const unauthorized = recordIds.filter((id) => !ownedIds.includes(id));
    if (unauthorized.length > 0) {
      throwError(
        "You can only include your own records in the emergency snapshot",
        403,
      );
      return;
    }

    const qrToken = uuidv4();

    const snapshot = await prisma.emergencySnapshot.create({
      data: {
        userId,
        title,
        description,
        qrToken,
        records: {
          createMany: {
            data: recordIds.map((recordId) => ({
              recordId,
            })),
          },
        },
      },
    });

    await auditService.logAction({
      req,
      action: AuditLogAction.EMERGENCY_SNAPSHOT_GENERATED,
      status: AuditLogStatus.SUCCESS,
      description: "Emergency QR snapshot generated",
      targetType: AuditLogTargetType.EMERGENCY,
      targetId: snapshot.id,
    });

    res.status(201).json({
      message: "Emergency snapshot generated",
      qrToken,
      snapshotId: snapshot.id,
      success: true,
    });
  } catch (err) {
    await auditService.logAction({
      req,
      action: AuditLogAction.EMERGENCY_SNAPSHOT_GENERATED,
      status: AuditLogStatus.FAILURE,
      description:
        err instanceof Error
          ? err.message
          : "Failed to generate emergency snapshot",
      targetType: AuditLogTargetType.EMERGENCY,
    });
    next(err);
  }
};
