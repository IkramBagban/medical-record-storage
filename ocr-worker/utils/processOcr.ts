import { OcrStatus } from "@prisma/client";
import { prisma } from "./db";

export const processOcr = async (key: string) => {
  console.log("Starting OCR processing...");

  await prisma.oCRResult.update({
    where: { fileKey: key },
    data: {
      status: OcrStatus.PROCESSING,
    },
  });

  // simulate
  await new Promise((resolve) => setTimeout(resolve, 30 * 1000));
  console.log("OCR task completed.");
};
