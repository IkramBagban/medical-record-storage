import { Response, NextFunction } from "express";
import {
  uploadRecordSchema,
  getRecordsSchema,
} from "../../zodSchema/record.schema";
import { prisma } from "../../utils/db";
import { throwError } from "../../utils/error";
import {
  CACHE_TTL,
  ExtendedRequest,
  RedisKeysPrefix,
} from "../../types/common";
import { s3Service } from "../../services/s3";
import {
  AuditLogAction,
  AuditLogStatus,
  AuditLogTargetType,
  CaregiverRequestStatus,
  PlanLimitStatus,
  UserRole,
} from "@prisma/client";
import { auditService } from "../../services/audit";
import { redisService } from "../../services/redis";
import {
  checkRecordAccess,
  getActualOwnerId,
  validateFileConstraints,
} from "../../utils/record";

const CACHE_KEYS = {
  RECORD: (id: string) => `record:${id}`,
  RECORDS_LIST: (userId: string, filters: string) =>
    `records:${userId}:${filters}`,
  CAREGIVER_ACCESS: (caregiverId: string, patientId: string) =>
    `caregiver:${caregiverId}:${patientId}`,
};

export const getUploadUrl = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = uploadRecordSchema.safeParse(req.body);
    if (!result.success) {
      throwError(JSON.stringify(result.error.flatten()), 400);
      return;
    }

    const { fileName, fileSize, mimeType, ownerId } = result.data;
    const uploaderId = req.user!.id;

    validateFileConstraints(fileSize, mimeType);

    const actualOwnerId = await getActualOwnerId(
      uploaderId,
      ownerId,
      req.user!.role,
    );

    const fileKey = s3Service.generateFileKey(actualOwnerId, fileName);
    const uploadUrl = await s3Service.generateUploadUrl(fileKey, mimeType);

    await auditService.logAction({
      req,
      action: AuditLogAction.RECORD_UPLOAD_GET_URL,
      status: AuditLogStatus.SUCCESS,
      description: "Upload URL generated successfully",
      targetType: AuditLogTargetType.RECORD,
      targetId: fileKey,
    });

    res.status(200).json({
      message: "Upload URL generated successfully",
      uploadUrl,
      fileKey,
      success: true,
    });
  } catch (err) {
    await auditService.logAction({
      req,
      action: AuditLogAction.RECORD_UPLOAD_GET_URL,
      status: AuditLogStatus.FAILURE,
      description:
        err instanceof Error ? err.message : "Failed to get upload URL",
      targetType: AuditLogTargetType.RECORD,
    });
    next(err);
  }
};

export const uploadRecord = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction,
) => {
  let recordCreated = false;
  let recordId: string | null = null;

  try {
    const result = uploadRecordSchema.safeParse(req.body);
    if (!result.success) {
      throwError(JSON.stringify(result.error.flatten()), 400);
      return;
    }

    const {
      title,
      type,
      language,
      tags,
      recordDate,
      fileName,
      fileSize,
      mimeType,
      ownerId,
    } = result.data;
    const uploaderId = req.user!.id;

    validateFileConstraints(fileSize, mimeType);

    const { fileKey } = req.body;
    if (!fileKey) {
      throwError("File key is required", 400);
      return;
    }
    validateFileConstraints(fileSize, mimeType);
    // Verify S3 upload was successful
    const fileExists = await s3Service.verifyFileExists(fileKey);
    if (!fileExists && process.env.NODE_ENV !== "test") {
      throwError(
        "File upload verification failed. Please upload the file first.",
        400,
      );
      return;
    }

    let actualOwnerId = uploaderId;

    if (ownerId && req.user!.role === "CAREGIVER") {
      const caregiverAccess = await prisma.caregiverRequest.findFirst({
        where: {
          caregiverId: uploaderId,
          patientId: ownerId,
          status: "APPROVED",
        },
      });

      if (!caregiverAccess) {
        throwError(
          "You don't have access to upload records for this patient",
          403,
        );
        return;
      }

      actualOwnerId = ownerId;
    }

    const [record] = await prisma.$transaction([
      prisma.record.create({
        data: {
          title,
          type,
          language,
          tags,
          recordDate: new Date(recordDate),
          fileName,
          fileSize,
          mimeType,
          fileKey: fileKey,
          ownerId: actualOwnerId,
          uploaderId,
        },
      }),
      prisma.planLimit.updateMany({
        where: { userId: actualOwnerId, status: PlanLimitStatus.ACTIVE },
        data: {
          totalRecords: {
            increment: 1,
          },
        },
      }),
    ]);

    recordCreated = true;
    recordId = record.id;

    await Promise.all([
      auditService.logAction({
        req,
        action: AuditLogAction.RECORD_UPLOAD,
        status: AuditLogStatus.SUCCESS,
        description: "Record uploaded successfully",
        targetType: AuditLogTargetType.RECORD,
        targetId: record.id,
      }),

      redisService.deleteKeysByPattern(
        `${RedisKeysPrefix.RECORDS_LIST}:${actualOwnerId}*`,
      ),
    ]);
    res.status(201).json({
      message: "Record uploaded successfully",
      record,
      success: true,
    });
  } catch (err) {
    // Cleanup on failure
    if (recordCreated && recordId) {
      try {
        // If record was created but something failed after, clean up
        await prisma.$transaction([
          prisma.record.delete({
            where: { id: recordId },
          }),
          prisma.planLimit.updateMany({
            where: { userId: req.user!.id, status: PlanLimitStatus.ACTIVE },
            data: {
              totalRecords: {
                decrement: 1,
              },
            },
          }),
        ]);
      } catch (cleanupErr) {
        console.error("Failed to cleanup after error:", cleanupErr);
      }
    }

    if (
      req.body.fileKey &&
      err instanceof Error &&
      !err.message.includes("File upload verification failed")
    ) {
      try {
        await s3Service.deleteFile(req.body.fileKey);
      } catch (s3CleanupErr) {
        console.error("Failed to cleanup S3 file:", s3CleanupErr);
      }
    }

    await auditService.logAction({
      req,
      action: AuditLogAction.RECORD_UPLOAD,
      status: AuditLogStatus.FAILURE,
      description:
        err instanceof Error ? err.message : "Failed to upload record",
      targetType: AuditLogTargetType.RECORD,
    });
    next(err);
  }
};

export const getRecords = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = getRecordsSchema.safeParse(req.query);
    if (!result.success) {
      throwError(JSON.stringify(result.error.flatten()), 400);
      return;
    }

    const {
      type,
      dateFrom,
      dateTo,
      tags,
      userId,
      page = "1",
      limit = "10",
    } = result.data;
    const currentUserId = req.user!.id;
    const currentUserRole = req.user!.role;

    let ownerId = currentUserId;

    if (userId && currentUserRole === UserRole.CAREGIVER) {
      const caregiverAccess = await checkRecordAccess(
        currentUserId,
        userId,
        CaregiverRequestStatus.APPROVED,
      );

      if (!caregiverAccess) {
        throwError(
          "You don't have access to view records for this patient",
          403,
        );
        return;
      }

      ownerId = userId;
    }

    const filtersKey = JSON.stringify({
      type,
      dateFrom,
      dateTo,
      tags,
      page,
      limit,
    });
    const cacheKey = `${RedisKeysPrefix.RECORDS_LIST}:${ownerId}:${filtersKey}`;

    const cachedResult = await redisService.get(cacheKey, { json: true });
    if (cachedResult) {
      auditService.logAction({
        req,
        action: AuditLogAction.RECORDS_VIEWED,
        status: AuditLogStatus.SUCCESS,
        description: "Cache hit: Records retrieved successfully",
        targetType: AuditLogTargetType.RECORD,
      });
      res.status(200).json(cachedResult);
      return;
    }

    const filters: any = {
      ownerId,
      isDeleted: false,
    };

    if (type) filters.type = type;
    if (dateFrom || dateTo) {
      filters.recordDate = {};
      if (dateFrom) filters.recordDate.gte = new Date(dateFrom);
      if (dateTo) filters.recordDate.lte = new Date(dateTo);
    }
    if (tags) {
      const tagArray = tags.split(",").map((tag) => tag.trim());
      filters.tags = { hasSome: tagArray };
    }

    // Pagi
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [records, totalCount] = await Promise.all([
      prisma.record.findMany({
        where: filters,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { recordDate: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.record.count({ where: filters }),
    ]);

    auditService.logAction({
      req,
      action: AuditLogAction.RECORDS_VIEWED,
      status: AuditLogStatus.SUCCESS,
      description: "Records retrieved successfully",
      targetType: AuditLogTargetType.RECORD,
    });

    const response = {
      message: "Records retrieved successfully",
      success: true,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
      records: records.map((record) => ({
        ...record,
        downloadUrl: s3Service.getDownloadUrl(record.fileKey),
      })),
    };

    await redisService.set(cacheKey, response, {
      EX: CACHE_TTL.RECORDS_LIST,
      json: true,
    });
    res.status(200).json(response);
  } catch (err) {
    await auditService.logAction({
      req,
      action: AuditLogAction.RECORDS_VIEWED,
      status: AuditLogStatus.FAILURE,
      description:
        err instanceof Error ? err.message : "Failed to retrieve records",
      targetType: AuditLogTargetType.RECORD,
    });
    next(err);
  }
};

export const getRecord = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.id;
    const currentUserRole = req.user!.role;
    const cacheKey = CACHE_KEYS.RECORD(id);
    const cached = await redisService.get(cacheKey, { json: true });
    const record =
      typeof cached === "object" && cached !== null
        ? cached
        : await prisma.record.findUnique({
            where: { id },
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              uploader: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          });

    if (!record || record.isDeleted) {
      throwError("Record not found", 404);
      return;
    }

    let hasAccess = false;

    if (record.ownerId === currentUserId) {
      hasAccess = true;
    } else if (currentUserRole === "CAREGIVER") {
      hasAccess = await checkRecordAccess(
        currentUserId,
        record.ownerId,
        CaregiverRequestStatus.APPROVED,
      );
    }

    if (!hasAccess) {
      throwError("You don't have access to view this record", 403);
      return;
    }

    const downloadUrl = s3Service.getDownloadUrl(record.fileKey);

    await auditService.logAction({
      req,
      action: AuditLogAction.RECORD_VIEWED,
      status: AuditLogStatus.SUCCESS,
      description: "Record retrieved successfully",
      targetType: AuditLogTargetType.RECORD,
      targetId: record.id,
    });

    await redisService.set(cacheKey, record, {
      EX: CACHE_TTL.RECORD,
      json: true,
    });
    res.status(200).json({
      message: "Record retrieved successfully",
      success: true,
      record: {
        ...record,
        downloadUrl,
      },
    });
  } catch (err) {
    await auditService.logAction({
      req,
      action: AuditLogAction.RECORD_VIEWED,
      status: AuditLogStatus.FAILURE,
      description:
        err instanceof Error ? err.message : "Failed to retrieve record",
      targetType: AuditLogTargetType.RECORD,
    });
    next(err);
  }
};

export const deleteRecord = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.id;

    const record = await prisma.record.findUnique({
      where: { id, ownerId: currentUserId, isDeleted: false },
    });

    if (!record) {
      throwError("Record not found", 404);
      return;
    }

    await prisma.record.update({
      where: { id, ownerId: currentUserId },
      data: { isDeleted: true },
    });

    await auditService.logAction({
      req,
      action: AuditLogAction.RECORD_DELETE,
      status: AuditLogStatus.SUCCESS,
      description: "Record deleted successfully",
      targetType: AuditLogTargetType.RECORD,
      targetId: record.id,
    });

    redisService.deleteKeysByPattern(
      `${RedisKeysPrefix.RECORDS_LIST}:${currentUserId}*`,
    );

    res.status(200).json({
      message: "Record deleted successfully",
      success: true,
    });
  } catch (err) {
    await auditService.logAction({
      req,
      action: AuditLogAction.RECORD_DELETE,
      status: AuditLogStatus.FAILURE,
      description:
        err instanceof Error ? err.message : "Failed to delete record",
      targetType: AuditLogTargetType.RECORD,
      targetId: req.params.id,
    });
    next(err);
  }
};
