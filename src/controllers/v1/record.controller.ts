import { Request, Response, NextFunction } from "express";
import {
  uploadRecordSchema,
  getRecordsSchema,
} from "../../zodSchema/record.schema";
import { prisma } from "../../utils/db";
import { throwError } from "../../utils/error";
import { ExtendedRequest } from "../../types/common";
import { s3Service } from "../../services/s3";
import { UserRole } from "../../generated/prisma";

export const getUploadUrl = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = uploadRecordSchema.safeParse(req.body);
    if (!result.success) {
      throwError(JSON.stringify(result.error.flatten()), 400);
      return;
    }

    const { fileName, fileSize, mimeType } = result.data;
    const userId = req.user!.id;

    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
      "text/plain",
    ];

    if (!allowedMimeTypes.includes(mimeType)) {
      throwError(
        "Invalid file type. Only images, PDFs, and text files are allowed",
        400
      );
      return;
    }

    if (fileSize > 10 * 1024 * 1024) {
      // filesize should be < 10MB
      throwError("File size too large. Maximum size is 10MB", 400);
      return;
    }

    const fileKey = s3Service.generateFileKey(userId, fileName);
    const uploadUrl = await s3Service.generateUploadUrl(fileKey, mimeType);

    res.status(200).json({
      message: "Upload URL generated successfully",
      uploadUrl,
      fileKey,
      success: true,
    });
  } catch (err) {
    next(err);
  }
};

export const uploadRecord = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction
) => {
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

    let actualOwnerId = uploaderId;

    if (ownerId && req.user!.role === "CAREGIVER") {
      // Verify caregiver has access to this patient
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
          403
        );
        return;
      }

      actualOwnerId = ownerId;
    }

    const { fileKey } = req.body;
    if (!fileKey) {
      throwError("File key is required", 400);
      return;
    }

    const record = await prisma.record.create({
      data: {
        title,
        type,
        language,
        tags,
        recordDate: new Date(recordDate),
        fileName,
        fileSize,
        mimeType,
        fileUrl: fileKey,
        ownerId: actualOwnerId,
        uploaderId,
      },
    });

    res.status(201).json({
      message: "Record uploaded successfully",
      record,
      success: true,
    });
  } catch (err) {
    next(err);
  }
};

export const getRecords = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction
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
      const caregiverAccess = await prisma.caregiverRequest.findFirst({
        where: {
          caregiverId: currentUserId,
          patientId: userId,
          status: "APPROVED",
        },
      });

      if (!caregiverAccess) {
        throwError(
          "You don't have access to view records for this patient",
          403
        );
        return;
      }

      ownerId = userId;
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

    res.status(200).json({
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
        downloadUrl: s3Service.getDownloadUrl(record.fileUrl),
      })),
    });
  } catch (err) {
    next(err);
  }
};

export const getRecord = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.id;
    const currentUserRole = req.user!.role;

    const record = await prisma.record.findUnique({
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
      const caregiverAccess = await prisma.caregiverRequest.findFirst({
        where: {
          caregiverId: currentUserId,
          patientId: record.ownerId,
          status: "APPROVED",
        },
      });
      hasAccess = !!caregiverAccess;
    }

    if (!hasAccess) {
      throwError("You don't have access to view this record", 403);
      return;
    }

    const downloadUrl = s3Service.getDownloadUrl(record.fileUrl);

    res.status(200).json({
      message: "Record retrieved successfully",
      success: true,
      record: {
        ...record,
        downloadUrl,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteRecord = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction
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

    res.status(200).json({
      message: "Record deleted successfully",
      success: true,
    });
  } catch (err) {
    next(err);
  }
};
