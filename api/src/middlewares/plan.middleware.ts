import { NextFunction, Response } from "express";
import { ExtendedRequest } from "../types/common";
import { FeaturePermission } from "../services/email/types";
import { Plan } from "../lib/rbac/subscription/plan";

export const plan = new Plan();

export const enforcePlanLimit = (
  featurePermission: FeaturePermission,
  errorMessage?: string,
) => {
  return async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    console.log("Enforcing plan limit for feature:", featurePermission);
    switch (featurePermission) {
      case FeaturePermission.UPLOAD_RECORD:
        const canUpload = await plan.canUploadRecord(req.user!.id);
        if (!canUpload) {
          res.status(403).json({
            error:
              errorMessage ||
              "Plan limit exceeded, You can't upload more records",
          });
          return;
        }
        break;
    }
    next();
  };
};
