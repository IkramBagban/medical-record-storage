import { OcrStatus } from "../src/generated/client";
import { prisma } from "./db";

export const processOcr = async (key: string) => {
  console.log("Starting OCR processing...");

  const ocrResult = await prisma.oCRResult.update({
    where: { fileKey: key },
    data: {
      status: OcrStatus.PROCESSING,
    },
  });
  console.log("OCR Result updated to PROCESSING:", ocrResult);

  // simulate
  await new Promise((resolve) => setTimeout(resolve, 30 * 1000)); 
  console.log("OCR task completed.");
};
