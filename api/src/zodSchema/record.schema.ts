import z from "zod";

export const uploadRecordSchema = z.object({
  title: z.string().min(1),
  type: z.enum([
    "PRESCRIPTION",
    "LAB_REPORT",
    "SCAN",
    "CONSULTATION",
    "VACCINATION",
    "MEDICAL_CERTIFICATE",
    "OTHER",
  ]),
  language: z
    .string()
    .length(
      2,
      "Invalid language code. Should use ISO 639-1(i.e 'en', 'hi', 'fr', etc) format.",
    )
    .optional()
    .default("en"),
  tags: z.array(z.string()).default([]),
  recordDate: z.string().datetime(),
  fileName: z.string(),
  fileSize: z.number().positive(),
  mimeType: z.string(),
  ownerId: z.string().optional(),
});

export const getRecordsSchema = z.object({
  type: z
    .enum([
      "PRESCRIPTION",
      "LAB_REPORT",
      "SCAN",
      "CONSULTATION",
      "VACCINATION",
      "MEDICAL_CERTIFICATE",
      "OTHER",
    ])
    .optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  tags: z.string().optional(),
  userId: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const ocrUploadSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  mimeType: z.string().min(1, "MIME type is required"),
});

export const OcrFailureSchema = z.object({
  fileKey: z.string(),
});
