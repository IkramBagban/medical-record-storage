import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    this.bucketName = process.env.S3_BUCKET_NAME!;
  }

  async generateUploadUrl(key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600,
    });

    return signedUrl;
  }

  getDownloadUrl(key: string): string {
    if (!process.env.CLOUDFRONT_DISTRIBUTION_URL) {
      throw new Error("CLOUDFRONT_DISTRIBUTION_URL is not defined");
    }
    const cloudfrontUrl = process.env.CLOUDFRONT_DISTRIBUTION_URL;
    return `${cloudfrontUrl}${key}`;
  }

  generateFileKey(userId: string, fileName: string): string {
    const fileExt = fileName.split(".").pop();
    return `medical-records/${userId}/${uuidv4()}.${fileExt}`;
  }
}

export const s3Service = new S3Service();
