import { Response, NextFunction } from "express";
import { ocrUploadSchema } from "../../zodSchema/record.schema";
import { prisma } from "../../utils/db";
import { throwError } from "../../utils/error";
import { ExtendedRequest } from "../../types/common";
import { s3Service } from "../../services/s3";
import {
  AuditLogAction,
  AuditLogStatus,
  AuditLogTargetType,
  OcrStatus,
} from "@prisma/client";
import { auditService } from "../../services/audit";
import { v4 as uuidv4 } from "uuid";
import { allowedMimeTypes } from "../../utils/constants";

export const getOcrResults = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;

    const ocrResults = await prisma.oCRResult.findMany({
      where: { ownerId: userId },
    });

    if (!ocrResults || ocrResults.length === 0) {
      throwError("No OCR results found for this user", 404);
      return;
    }

    await auditService.logAction({
      req,
      action: AuditLogAction.OCR_RESULTS_VIEWED,
      status: AuditLogStatus.SUCCESS,
      description: "OCR results retrieved successfully",
      targetType: AuditLogTargetType.RECORD,
      targetId: userId,
    });

    res.status(200).json({
      message: "OCR results retrieved successfully",
      data: ocrResults.map((result) => ({
        ...result,
        downloadUrl: s3Service.getDownloadUrl(result.fileKey),
      })),
      success: true,
    });
  } catch (err) {
    await auditService.logAction({
      req,
      action: AuditLogAction.OCR_RESULTS_VIEWED,
      status: AuditLogStatus.FAILURE,
      description:
        err instanceof Error ? err.message : "Failed to get OCR results",
      targetType: AuditLogTargetType.RECORD,
    });
    next(err);
  }
};

export const ocrUpload = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = ocrUploadSchema.safeParse(req.body);
    if (!result.success) {
      throwError(JSON.stringify(result.error.flatten()), 400);
      return;
    }

    const { fileName, mimeType } = result.data;
    const userId = req.user!.id;

    if (!allowedMimeTypes.includes(mimeType)) {
      throwError(
        "Invalid file type. Only images, PDFs, and text files are allowed",
        400,
      );
      return;
    }

    const fileExt = fileName.split(".").pop();
    if (!fileExt) {
      throwError("File name must have an extension", 400);
      return;
    }

    const fileKey = `ocr-files/${userId}/${uuidv4()}.${fileExt}`;
    const uploadUrl = await s3Service.generateUploadUrl(fileKey, mimeType);

    await prisma.oCRResult.create({
      data: {
        fileKey,
        fileName,
        mimeType,
        status: OcrStatus.PENDING,
        ownerId: userId,
      },
    });

    await auditService.logAction({
      req,
      action: AuditLogAction.OCR_FILE_UPLOADED,
      status: AuditLogStatus.SUCCESS,
      description: "OCR Upload URL generated successfully",
      targetType: AuditLogTargetType.RECORD,
      targetId: fileKey,
    });

    res.status(200).json({
      message: "OCR Upload URL generated successfully",
      uploadUrl,
      fileKey,
      success: true,
    });
  } catch (err) {
    await auditService.logAction({
      req,
      action: AuditLogAction.OCR_FILE_UPLOADED,
      status: AuditLogStatus.FAILURE,
      description:
        err instanceof Error ? err.message : "Failed to get upload URL",
      targetType: AuditLogTargetType.RECORD,
    });
    next(err);
  }
};
