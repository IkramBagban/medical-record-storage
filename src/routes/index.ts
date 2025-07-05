import express from "express";
const router = express.Router();

import authRoutes from "./v1/auth.route";
import recordRoutes from "./v1/record.route";
import { authMiddleware } from "../middlewares/auth.middleware";

router.use("/v1/auth", authRoutes);
router.use("/v1/records", authMiddleware, recordRoutes);

export default router;
