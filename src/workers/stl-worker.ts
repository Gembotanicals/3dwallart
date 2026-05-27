// STL Generation Worker — standalone process
// Run with: npx ts-node --esm src/workers/stl-worker.ts
// Requires: REDIS_URL env var

import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import {
  buildHeightGridServer,
  buildGeometryServer,
  buildMoldGeometryServer,
  toSTLBuffer,
  ServerReliefSettings,
} from "../lib/relief-engine-server";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const prisma = new PrismaClient();

// R2 client (inline to avoid Next.js module resolution issues)
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});
const R2_BUCKET = process.env.R2_BUCKET_NAME || "reliefforge";
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";

interface ExportJobData {
  exportId: string;
  projectId: string;
  settings: ServerReliefSettings;
  imageDataUrl: string;
  format: "STL" | "OBJ" | "THREE_MF";
  resolution: number;
  tileCol?: number;
  tileRow?: number;
}

async function processExportJob(job: Job<ExportJobData>): Promise<void> {
  const { exportId, projectId, settings, imageDataUrl, resolution } = job.data;

  console.log(`[worker] Processing export ${exportId} at ${resolution}px`);

  // Update status to PROCESSING
  await prisma.export.update({
    where: { id: exportId },
    data: { status: "PROCESSING" },
  });

  // Update job progress
  await job.updateProgress(10);

  // Decode image from data URL
  const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
  const imageBuffer = Buffer.from(base64Data, "base64");

  await job.updateProgress(25);

  // Get pixel data using sharp
  const { data: pixels, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const imgWidth = info.width;
  const imgHeight = info.height;

  await job.updateProgress(40);

  // Build height grid (server-side)
  const settingsWithRes = { ...settings, res: resolution };
  const hg = buildHeightGridServer(pixels, imgWidth, imgHeight, settingsWithRes);
  if (!hg) {
    throw new Error("Failed to build height grid from image data");
  }

  await job.updateProgress(60);

  // Build geometry
  const geo =
    settings.out === "MOLD"
      ? buildMoldGeometryServer(hg, settings)
      : buildGeometryServer(hg, settings);
  if (!geo) {
    throw new Error("Failed to build geometry");
  }

  await job.updateProgress(75);

  // Generate STL buffer
  const stlBuffer = toSTLBuffer(geo);

  await job.updateProgress(85);

  // Upload to R2
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true, name: true },
  });
  const userId = project?.userId || "unknown";
  const timestamp = Date.now();
  const r2Key = `exports/${userId}/${exportId}-${timestamp}.stl`;

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key,
      Body: stlBuffer,
      ContentType: "application/octet-stream",
    })
  );

  const r2Url = `https://${R2_BUCKET}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${r2Key}`;

  await job.updateProgress(95);

  // Update export record
  await prisma.export.update({
    where: { id: exportId },
    data: {
      status: "COMPLETED",
      url: r2Url,
      fileSize: stlBuffer.length,
      completedAt: new Date(),
    },
  });

  await job.updateProgress(100);
  console.log(
    `[worker] Export ${exportId} completed: ${geo.tris.toLocaleString()} tris, ${(stlBuffer.length / 1024).toFixed(0)} KB`
  );
}

// Start the worker
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  console.error("[worker] REDIS_URL not set — worker cannot start without Redis");
  process.exit(1);
}

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
}) as any;

const worker = new Worker<ExportJobData>(
  "stl-generation",
  processExportJob,
  {
    connection,
    concurrency: 2,
    limiter: {
      max: 10,
      duration: 60000, // max 10 jobs per minute
    },
  }
);

worker.on("completed", (job) => {
  console.log(`[worker] Job ${job.id} completed`);
});

worker.on("failed", async (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err.message);
  // Update export status to FAILED
  if (job?.data?.exportId) {
    try {
      await prisma.export.update({
        where: { id: job.data.exportId },
        data: {
          status: "FAILED",
          errorMsg: err.message || "Worker processing failed",
        },
      });
    } catch (dbErr) {
      console.error("[worker] Failed to update export status:", dbErr);
    }
  }
});

worker.on("error", (err) => {
  console.error("[worker] Worker error:", err);
});

console.log("[worker] STL generation worker started (concurrency: 2)");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[worker] Shutting down...");
  await worker.close();
  await prisma.$disconnect();
  await connection.quit();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[worker] Shutting down...");
  await worker.close();
  await prisma.$disconnect();
  await connection.quit();
  process.exit(0);
});
