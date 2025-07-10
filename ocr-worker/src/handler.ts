import { prisma } from "../utils/db";
import { OcrStatus } from "@prisma/client";
import { processOcr } from "../utils/processOcr";

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
    throw new Error("Invalid S3 event format.");
  }

  const key = s3Record.object.key;

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

export const ocrFailureHandler = async (event: any) => {
  const record = event.Records[0];

  let key: string | undefined;

  try {
    const s3Info = JSON.parse(record.body);
    const s3Record = s3Info.Records?.[0]?.s3;
    key = s3Record?.object?.key;
    if (!key) throw new Error("Missing S3 key in DLQ event");
  } catch (err) {
    console.error("Failed to parse DLQ event:", err);
    return;
  }

  try {
    const response = await fetch(
      `${process.env.API_URL}/v1/ocr/failure/${key}`,
      {
        method: "PATCH",
      }
    );
    const data = await response.json();
    console.info("DLQ handler success:", data);
  } catch (err) {
    console.error("DLQ fetch to backend failed:", err);
  }
};
