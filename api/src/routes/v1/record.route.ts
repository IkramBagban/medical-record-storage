import express from "express";
import {
  getUploadUrl,
  uploadRecord,
  getRecords,
  getRecord,
  deleteRecord,
  ocrUpload,
} from "../../controllers/v1/record.controller";

const router = express.Router();

router.post("/upload-url", getUploadUrl);
router.post("/upload", uploadRecord);
router.get("/", getRecords);
router.get("/:id", getRecord);
router.delete("/:id", deleteRecord);

router.post("/ocr-upload", ocrUpload);

export default router;
