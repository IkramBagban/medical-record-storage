import express from "express";
import { ocrUpload, getOcrResults } from "../../controllers/v1/ocr.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = express.Router();

router.get("/", authMiddleware, getOcrResults);
router.post("/upload", authMiddleware, ocrUpload);
export default router;
