import express from "express";
import {
  ocrUpload,
  ocrFailure,
  getOcrResults,
} from "../../controllers/v1/ocr.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = express.Router();

router.get("/", authMiddleware, getOcrResults);
router.post("/upload", authMiddleware, ocrUpload);

// this will be called when OCR process fails in the worker
router.patch("/failure", ocrFailure);

export default router;
