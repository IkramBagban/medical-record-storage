import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
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

  async verifyFileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getFileSize(key: string): Promise<number> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      const response = await this.s3Client.send(command);
      return response.ContentLength || 0;
    } catch (error) {
      throw new Error(
        `Failed to get file size: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.s3Client.send(command);
    } catch (error) {
      throw new Error(
        `Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

export const s3Service = new S3Service();
