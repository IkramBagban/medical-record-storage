import { prisma } from "../utils/db";
import { OcrStatus } from "./generated/client";

export const ocrFailureHandler = async (event: any) => {
  const record = event.Records[0];

  let key: string | undefined;
  console.log("process.env.API_URL:", process.env.API_URL);

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
    console.log("Received DLQ event for key:", key);

    await prisma.oCRResult.update({
      where: {
        fileKey: decodeURIComponent(key),
      },
      data: {
        status: OcrStatus.FAILED,
      },
    });
    console.log("OCR status updated to FAILED for key:", key);
  } catch (err) {
    console.error("DLQ fetch to backend failed:", err);
  }
};
