import express from "express";
const router = express.Router();

import authRoutes from "./v1/auth.route";
import recordRoutes from "./v1/record.route";
import caregiverRoutes from "./v1/caregiver.route";
import emergencyRoutes from "./v1/emergency.route";
import ocrRoutes from "./v1/ocr.route";
import { authMiddleware } from "../middlewares/auth.middleware";

router.use("/v1/auth", authRoutes);
router.use("/v1/records", authMiddleware, recordRoutes);
router.use("/v1/caregiver", authMiddleware, caregiverRoutes);
router.use("/v1/emergency", emergencyRoutes);
router.use("/v1/ocr", ocrRoutes);

export default router;
