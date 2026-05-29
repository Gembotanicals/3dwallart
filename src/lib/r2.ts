import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: (process.env.R2_ACCESS_KEY_ID || "").trim(),
    secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY || "").trim(),
  },
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME || "reliefforge";
export const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";

/**
 * Generate a unique storage key for a user's file
 */
export function generateKey(userId: string, filename: string): string {
  const timestamp = Date.now();
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `uploads/${userId}/${timestamp}-${sanitized}`;
}

/**
 * Upload a file to R2 and return the storage key
 */
export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  // Return the key — callers should use getSignedUrl() for downloads
  return key;
}

/**
 * Delete a file from R2
 */
export async function deleteFile(key: string): Promise<void> {
  await r2.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    })
  );
}

/**
 * Generate a pre-signed URL for temporary access to a file
 */
export async function getSignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });

  return awsGetSignedUrl(r2, command, { expiresIn });
}

/**
 * Extract the key from a full R2 URL
 */
export function extractKeyFromUrl(url: string): string | null {
  // Handle path-style URLs (forcePathStyle: true)
  // Format: https://{accountId}.r2.cloudflarestorage.com/{bucket}/{key}
  const pathStylePrefix = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/`;
  if (url.startsWith(pathStylePrefix)) {
    return url.slice(pathStylePrefix.length);
  }
  
  // Handle virtual-hosted style URLs (forcePathStyle: false)
  // Format: https://{bucket}.{accountId}.r2.cloudflarestorage.com/{key}
  const virtualHostedPrefix = `https://${R2_BUCKET}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/`;
  if (url.startsWith(virtualHostedPrefix)) {
    return url.slice(virtualHostedPrefix.length);
  }
  
  return null;
}
