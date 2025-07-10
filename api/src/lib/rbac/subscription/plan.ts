import { PlayType } from "@prisma/client";
import { prisma } from "../../../utils/db";

const planLimitConfig = {
  [PlayType.FREEMIUM]: {
    recordLimit: 3,
  },
  [PlayType.PREMIUM]: {
    recordLimit: 5,
  },
};

export class Plan {
  constructor() {}

  async canUploadRecord(userId: string): Promise<boolean> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: "ACTIVE",
      },
      include: {
        planLimit: {
          select: {
            totalRecords: true,
          },
        },
      },
    });

    if (!subscription || !subscription.planLimit) {
      return false;
    }

    const planType = subscription.planType;
    const recordLimit = planLimitConfig[planType].recordLimit;
    const currentRecordCount = subscription.planLimit?.totalRecords;

    return currentRecordCount < recordLimit;
  }
}
