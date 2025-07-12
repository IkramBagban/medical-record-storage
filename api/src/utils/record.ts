import { CaregiverRequestStatus } from "@prisma/client";
import { prisma } from "./db";
import { allowedMimeTypes } from "./constants";
import { throwError } from "./error";

export const checkRecordAccess = async (
  caregiverId: string,
  patientId: string,
  status: CaregiverRequestStatus
) => {
  const caregiverAccess = await prisma.caregiverRequest.findFirst({
    where: {
      caregiverId: caregiverId,
      patientId: patientId,
      status: status,
    },
  });
  return !!caregiverAccess;
};

export const validateFileConstraints = (fileSize: number, mimeType: string) => {
  if (!allowedMimeTypes.includes(mimeType)) {
    throwError(
      "Invalid file type. Only images, PDFs, and text files are allowed",
      400
    );
  }

  if (fileSize > 10 * 1024 * 1024) {
    throwError("File size too large. Maximum size is 10MB", 400);
  }
};

export const getActualOwnerId = async (
  uploaderId: string,
  ownerId: string | undefined,
  userRole: string
) => {
  let actualOwnerId = uploaderId;

  if (ownerId && userRole === "CAREGIVER") {
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
    }

    actualOwnerId = ownerId;
  }

  return actualOwnerId;
};
