import { NextResponse } from "next/server";
import { r2, R2_BUCKET, R2_ACCOUNT_ID } from "@/lib/r2";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: any = {
    R2_BUCKET,
    R2_ACCOUNT_ID: R2_ACCOUNT_ID ? `${R2_ACCOUNT_ID.substring(0, 6)}...` : "MISSING",
    hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  };

  try {
    const response = await r2.send(
      new ListObjectsV2Command({ Bucket: R2_BUCKET, MaxKeys: 5 })
    );
    results.connection = "OK";
    results.objectCount = response.KeyCount || 0;
    results.sampleKeys = (response.Contents || []).map((o: any) => o.Key);
  } catch (err: any) {
    results.connection = "FAILED";
    results.error = err.message;
    results.code = err.name || err.$metadata?.httpStatusCode;
  }

  return NextResponse.json(results);
}
