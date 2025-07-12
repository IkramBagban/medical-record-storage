import express from "express";
import {
  generateEmergencySnapshot,
  getEmergencyData,
} from "../../controllers/v1/emergency.controller";
import { enforceRole } from "../../middlewares/requirePermission.middleware";
import { UserRole } from "@prisma/client";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = express.Router();

router.get("/:qrToken", getEmergencyData);

router.post(
  "/generate",
  authMiddleware,
  enforceRole([UserRole.PATIENT, UserRole.DEPENDENT]),
  generateEmergencySnapshot,
);

export default router;
