import express from "express";
import {
  requestCaregiverAccess,
  approveCaregiverRequest,
  getCaregiverRequests,
} from "../../controllers/v1/caregiver.controller";
import { enforceRole } from "../../middlewares/requirePermission.middleware";
import { UserRole } from "@prisma/client";

const router = express.Router();

router.get("/requests", getCaregiverRequests);
router.post(
  "/request",
  enforceRole([UserRole.CAREGIVER], "Only caregivers can request access"),
  requestCaregiverAccess
);
router.patch(
  "/approve",
  enforceRole([UserRole.PATIENT, UserRole.DEPENDENT], "Only patients and dependents can approve requests"),
  approveCaregiverRequest
);

export default router;
