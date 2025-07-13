import { prisma } from "../utils/db";
import { processOcr } from "../utils/processOcr";
import { OcrStatus } from "./generated/client";

export const ocrProcessor = async (event: any) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  const record = event.Records[0];

  let s3Info;
  try {
    s3Info = JSON.parse(record.body);
  } catch (err) {
    console.error("Failed to parse SQS body:", err);
    throw err;
  }

  const s3Record = s3Info.Records?.[0]?.s3;
  if (!s3Record) {
    console.error("No S3 record found in message.");
    return;
  }

  const key = decodeURIComponent(s3Record.object.key);

  try {
    await processOcr(key);
    await prisma.oCRResult.update({
      where: { fileKey: key },
      data: {
        status: OcrStatus.COMPLETED,
        extractedData: {
          text: "Sample extracted text from OCR",
          metadata: {
            type: "prescription",
            tags: ["cholesterol", "medication"],
            Doctor: "Dr. Ahmed",
          },
        },
      },
    });
    console.log("OCR processing successful.");
  } catch (error) {
    await prisma.oCRResult.update({
      where: { fileKey: key },
      data: {
        status: OcrStatus.FAILED,
      },
    });
    console.error("Error during OCR processing:", error);
    throw error;
  }
};
