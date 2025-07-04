import express from "express";
const router = express.Router();

import authRoutes from "./v1/auth.route";

router.use("/v1/auth", authRoutes);

export default router;
