import { CaregiverRequestStatus } from "@prisma/client";
import { prisma } from "./db";

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
