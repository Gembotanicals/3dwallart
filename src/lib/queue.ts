import Redis from "ioredis";
import { Queue } from "bullmq";
import prisma from "@/lib/db";
import {
  buildHeightGridServer,
  buildGeometryServer,
  buildMoldGeometryServer,
  toSTLBuffer,
  ServerReliefSettings,
} from "@/lib/relief-engine-server";
import sharp from "sharp";

// Redis connection from REDIS_URL env
let connection: any = null;

if (process.env.REDIS_URL) {
  try {
    connection = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
    connection.on("error", (err: Error) => {
      console.error("[queue] Redis connection error:", err.message);
    });
  } catch (err: any) {
    console.warn("[queue] Failed to connect to Redis, using inline mode");
    connection = null;
  }
}

export const stlQueue = connection
  ? new Queue("stl-generation", { connection: connection as any })
  : null;

export interface ExportJobData {
  exportId: string;
  projectId: string;
  settings: ServerReliefSettings;
  imageDataUrl: string; // base64 data URL of the source image
  format: "STL" | "OBJ" | "THREE_MF";
  resolution: number;
  tileCol?: number;
  tileRow?: number;
}

/**
 * Add an export job to the BullMQ queue.
 * Falls back to inline processing if Redis is not available.
 */
export async function addExportJob(data: ExportJobData): Promise<void> {
  if (stlQueue) {
    await stlQueue.add("generate", data, {
      attempts: 2,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  } else {
    // No Redis available — process inline
    await processInline(data);
  }
}

/**
 * Fallback: process an export job inline (no Redis needed).
 * This runs synchronously in the API route handler.
 */
export async function processInline(data: ExportJobData): Promise<void> {
  const { exportId, settings, imageDataUrl, resolution } = data;

  try {
    // Update status to PROCESSING
    await prisma.export.update({
      where: { id: exportId },
      data: { status: "PROCESSING" },
    });

    // Decode image from data URL
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Get pixel data using sharp
    const { data: pixels, info } = await sharp(imageBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const imgWidth = info.width;
    const imgHeight = info.height;

    // Build height grid (server-side)
    const settingsWithRes = { ...settings, res: resolution };
    const hg = buildHeightGridServer(
      pixels,
      imgWidth,
      imgHeight,
      settingsWithRes
    );
    if (!hg) {
      throw new Error("Failed to build height grid");
    }

    // Build geometry
    const geo =
      settings.out === "MOLD"
        ? buildMoldGeometryServer(hg, settings)
        : buildGeometryServer(hg, settings);
    if (!geo) {
      throw new Error("Failed to build geometry");
    }

    // Generate STL buffer
    const stlBuffer = toSTLBuffer(geo);

    // Upload to R2
    const { uploadFile, generateKey } = await import("@/lib/r2");
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
      select: { userId: true, name: true },
    });
    const userId = project?.userId || "unknown";
    const r2Key = generateKey(
      userId,
      `export-${exportId}-${data.format.toLowerCase()}.stl`
    );
    const r2Url = await uploadFile(r2Key, stlBuffer, "application/octet-stream");

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
  } catch (error: any) {
    console.error(`[export ${exportId}] Error:`, error);
    await prisma.export.update({
      where: { id: exportId },
      data: {
        status: "FAILED",
        errorMsg: error.message || "Unknown error during export",
      },
    });
  }
}
