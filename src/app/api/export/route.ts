import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { addExportJob } from "@/lib/queue";
import { PLAN_LIMITS } from "@/types";
import type { ServerReliefSettings } from "@/lib/relief-engine-server";
import { getCurrentUserId } from "@/lib/clerk-helpers";
import { getSignedUrl } from "@/lib/r2";

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, format, resolution } = body;

    if (!projectId || !format) {
      return NextResponse.json(
        { error: "projectId and format are required" },
        { status: 400 }
      );
    }

    // Fetch user plan
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check plan limits
    const limits = PLAN_LIMITS[user.plan] || PLAN_LIMITS.FREE;
    const requestedRes = resolution || 220;

    // Validate resolution bounds
    if (requestedRes < 50) {
      return NextResponse.json(
        { error: "Resolution must be at least 50" },
        { status: 400 }
      );
    }

    if (requestedRes > limits.maxResolution) {
      return NextResponse.json(
        {
          error: `Resolution ${requestedRes} exceeds your plan limit of ${limits.maxResolution}`,
          upgradeRequired: true,
          maxResolution: limits.maxResolution,
        },
        { status: 403 }
      );
    }

    // Check format access
    if (format === "OBJ" && !limits.canExportOBJ) {
      return NextResponse.json(
        { error: "OBJ export requires PRO plan or higher", upgradeRequired: true },
        { status: 403 }
      );
    }
    if (format === "THREE_MF" && !limits.canExport3MF) {
      return NextResponse.json(
        { error: "3MF export requires PRO plan or higher", upgradeRequired: true },
        { status: 403 }
      );
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: userId },
      include: { _count: { select: { exports: true } } },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Create export record
    const exportRecord = await prisma.export.create({
      data: {
        projectId,
        format,
        resolution: requestedRes,
        status: "PENDING",
      },
    });

    // Get project settings (stored as JSON in DB)
    const settings = project.settings as unknown as ServerReliefSettings;

    // For the image data, we need the source image used in this project
    // The image data URL is typically stored in the project or fetched from the user's library
    // For now, we'll store a placeholder and the worker will need the actual image
    // In a real flow, the client sends the current image data along with the request
    const imageDataUrl = body.imageDataUrl || "";

    if (!imageDataUrl) {
      // If no image data, mark as failed
      await prisma.export.update({
        where: { id: exportRecord.id },
        data: {
          status: "FAILED",
          errorMsg: "No image data provided for export",
        },
      });
      return NextResponse.json(
        { error: "imageDataUrl is required" },
        { status: 400 }
      );
    }

    // Queue the job (or process inline if no Redis)
    await addExportJob({
      exportId: exportRecord.id,
      projectId,
      settings,
      imageDataUrl,
      format,
      resolution: requestedRes,
    });

    return NextResponse.json(
      {
        exportId: exportRecord.id,
        status: "PENDING",
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error("[api/export] POST error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = req.nextUrl.searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: userId },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // List exports for this project
    const exports = await prisma.export.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Sign download URLs for completed exports
    const signedExports = await Promise.all(
      exports.map(async (e) => {
        let url = e.url;
        if (e.status === "COMPLETED" && e.url) {
          try {
            url = await getSignedUrl(e.url, 3600);
          } catch {
            url = null;
          }
        }
        return { ...e, url };
      })
    );

    return NextResponse.json({ exports: signedExports });
  } catch (error: any) {
    console.error("[api/export] GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
