import { S3Client } from "@aws-sdk/client-s3";

// Configure S3Client for MinIO compatibility
export const s3Client = new S3Client({
  region: "us-east-1", // MinIO doesn't care about region, but SDK requires one
  endpoint: process.env.MINIO_ENDPOINT || "http://localhost:6007",
  forcePathStyle: true, // Required for MinIO
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER || "minio_admin",
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD || "Zt7@hNc5!bYf3jW9",
  },
});

export const BUCKET_NAME = process.env.MINIO_BUCKET || "storage-bucket";
export default s3Client;
