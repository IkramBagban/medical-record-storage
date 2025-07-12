import express from "express";
import {
  getUploadUrl,
  uploadRecord,
  getRecords,
  getRecord,
  deleteRecord,
} from "../../controllers/v1/record.controller";
import { enforcePlanLimit } from "../../middlewares/plan.middleware";
import { FeaturePermission } from "../../services/email/types";

const router = express.Router();

router.post(
  "/upload-url",
  enforcePlanLimit(FeaturePermission.UPLOAD_RECORD),
  getUploadUrl,
);
router.post(
  "/upload",
  enforcePlanLimit(FeaturePermission.UPLOAD_RECORD),
  uploadRecord,
);
router.get("/", getRecords);
router.get("/:id", getRecord);
router.delete("/:id", deleteRecord);

export default router;
