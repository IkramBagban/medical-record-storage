
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
