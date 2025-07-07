import { Request, Response, NextFunction } from "express";

import { prisma } from "../../utils/db";
import { throwError } from "../../utils/error";
import { ExtendedRequest } from "../../types/common";
import {
  approveCaregiverSchema,
  caregiverRequestSchema,
} from "../../zodSchema/caregiver.schema";
import {
  AuditLogAction,
  AuditLogStatus,
  AuditLogTargetType,
  UserRole,
} from "../../generated/prisma";
import { auditService } from "../../services/audit";

export const getCaregiverRequests = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    let requests;

    if (userRole === "CAREGIVER") {
      requests = await prisma.caregiverRequest.findMany({
        where: { caregiverId: userId },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (userRole === "PATIENT" || userRole === "DEPENDENT") {
      requests = await prisma.caregiverRequest.findMany({
        where: { patientId: userId },
        include: {
          caregiver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      throwError("Invalid user role", 403);
      return;
    }

    if (!requests || requests.length === 0) {
      return throwError("No caregiver requests found", 404);
    }

    await auditService.logAction({
      req,
      action: AuditLogAction.CAREGIVER_REQUEST_VIEWED,
      status: AuditLogStatus.SUCCESS,
      description: "Caregiver requests retrieved successfully",
      targetType: AuditLogTargetType.CAREGIVER_REQUEST,
    });

    res.status(200).json({
      message: "Caregiver requests retrieved successfully",
      requests,
      success: true,
    });
  } catch (err) {
    await auditService.logAction({
      req,
      action: AuditLogAction.CAREGIVER_REQUEST_VIEWED,
      status: AuditLogStatus.FAILURE,
      description: err instanceof Error ? err.message : "Failed to retrieve caregiver requests",
      targetType: AuditLogTargetType.CAREGIVER_REQUEST,
    });
    next(err);
  }
};

export const requestCaregiverAccess = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = caregiverRequestSchema.safeParse(req.body);
    if (!result.success) {
      throwError(JSON.stringify(result.error.flatten()), 400);
      return;
    }

    const { email, message } = result.data;
    const caregiverId = req.user!.id;

    const patient = await prisma.user.findUnique({
      where: { email: email }, // this email can be a patient or dependent
    });

    if (!patient) {
      throwError("Patient not found", 404);
      return;
    }

    if (
      patient.role !== UserRole.PATIENT &&
      patient.role !== UserRole.DEPENDENT
    ) {
      throwError("Can only request access to patients or dependents", 400);
      return;
    }

    const existingRequest = await prisma.caregiverRequest.findUnique({
      where: {
        caregiverId_patientId: {
          caregiverId,
          patientId: patient.id, // this can be a patient or dependent
        },
      },
    });

    if (existingRequest) {
      throwError("Request already exists", 409);
      return;
    }

    const caregiverRequest = await prisma.caregiverRequest.create({
      data: {
        caregiverId,
        patientId: patient.id,
        message,
      },
      select: {
        id: true,
        caregiverId: true,
        patientId: true,
      },
    });

    await auditService.logAction({
      req,
      action: AuditLogAction.CAREGIVER_ACCESS_REQUEST,
      status: AuditLogStatus.SUCCESS,
      description: `Caregiver access request sent to ${patient.email}`,
      targetType: AuditLogTargetType.CAREGIVER_REQUEST,
      targetId: caregiverRequest.id,
    });
    res.status(201).json({
      message: "Caregiver access request sent successfully",
      request: caregiverRequest,
      success: true,
    });
  } catch (err) {
    await auditService.logAction({
      req,
      action: AuditLogAction.CAREGIVER_ACCESS_REQUEST,
      status: AuditLogStatus.FAILURE,
      description: err instanceof Error ? err.message : "Failed to request caregiver access",
      targetType: AuditLogTargetType.CAREGIVER_REQUEST,
    });
    next(err);
  }
};

export const approveCaregiverRequest = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = approveCaregiverSchema.safeParse(req.body);
    if (!result.success) {
      throwError(JSON.stringify(result.error.flatten()), 400);
      return;
    }

    const { requestId, status } = result.data;
    const patientId = req.user!.id;

    const caregiverRequest = await prisma.caregiverRequest.findUnique({
      where: { id: requestId },
      include: {
        caregiver: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!caregiverRequest) {
      throwError("Request not found", 404);
      return;
    }

    if (caregiverRequest.patientId !== patientId) {
      throwError("You can only approve requests for your own account", 403);
      return;
    }

    if (caregiverRequest.status !== "PENDING") {
      throwError("Request has already been processed", 400);
      return;
    }

    const updatedRequest = await prisma.caregiverRequest.update({
      where: { id: requestId },
      data: { status },
      include: {
        caregiver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await auditService.logAction({
      req,
      action: AuditLogAction.CAREGIVER_APPROVED,
      status: AuditLogStatus.SUCCESS,
      description: `Caregiver request of ${updatedRequest.caregiver.email}  has been approved`,
      targetType: AuditLogTargetType.CAREGIVER_REQUEST,
      targetId: requestId,
    });
    res.status(200).json({
      message: `Caregiver request ${status.toLowerCase()} successfully`,
      request: updatedRequest,
      success: true,
    });
  } catch (err) {
    await auditService.logAction({
      req,
      action: AuditLogAction.CAREGIVER_APPROVED,
      status: AuditLogStatus.FAILURE,
      description: err instanceof Error ? err.message : "Failed to approve caregiver request",
      targetType: AuditLogTargetType.CAREGIVER_REQUEST,
      targetId: req.body.requestId,
    });
    next(err);
  }
};
