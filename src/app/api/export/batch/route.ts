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
    const { projectId, format, resolution, gridCols, gridRows, imageDataUrl } = body;

    if (!projectId || !format) {
      return NextResponse.json(
        { error: "projectId and format are required" },
        { status: 400 }
      );
    }

    if (!imageDataUrl) {
      return NextResponse.json(
        { error: "imageDataUrl is required" },
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

    const limits = PLAN_LIMITS[user.plan] || PLAN_LIMITS.FREE;
    const requestedRes = resolution || 220;

    // Check format access (same as single export route)
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
        },
        { status: 403 }
      );
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: userId },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const settings = project.settings as unknown as ServerReliefSettings;
    const cols = gridCols || settings.gc || 1;
    const rows = gridRows || settings.gr || 1;

    // Validate grid size to prevent DoS (max 8x8 = 64 tiles)
    if (cols < 1 || cols > 8 || rows < 1 || rows > 8) {
      return NextResponse.json(
        { error: "Grid size must be between 1×1 and 8×8" },
        { status: 400 }
      );
    }

    // Create export records for each tile
    const exportIds: string[] = [];

    for (let col = 1; col <= cols; col++) {
      for (let row = 1; row <= rows; row++) {
        const exportRecord = await prisma.export.create({
          data: {
            projectId,
            format,
            resolution: requestedRes,
            status: "PENDING",
          },
        });
        exportIds.push(exportRecord.id);

        // Queue job for each tile
        const tileSettings: ServerReliefSettings = {
          ...settings,
          tcol: col,
          trow: row,
        };

        await addExportJob({
          exportId: exportRecord.id,
          projectId,
          settings: tileSettings,
          imageDataUrl,
          format,
          resolution: requestedRes,
          tileCol: col,
          tileRow: row,
        });
      }
    }

    return NextResponse.json(
      {
        exportIds,
        totalCount: exportIds.length,
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error("[api/export/batch] POST error:", error);
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

    const exportIdsParam = req.nextUrl.searchParams.get("exportIds");
    if (!exportIdsParam) {
      return NextResponse.json(
        { error: "exportIds query parameter required" },
        { status: 400 }
      );
    }

    const exportIds = exportIdsParam.split(",").filter(Boolean);

    const exports = await prisma.export.findMany({
      where: {
        id: { in: exportIds },
        project: { userId: userId },
      },
    });

    const total = exports.length;
    const completed = exports.filter((e: { status: string }) => e.status === "COMPLETED").length;
    const failed = exports.filter((e: { status: string }) => e.status === "FAILED").length;
    const processing = exports.filter((e: { status: string }) => e.status === "PROCESSING").length;
    const pending = exports.filter((e: { status: string }) => e.status === "PENDING").length;

    // Generate signed URLs for completed exports
    const exportsWithUrls = await Promise.all(
      exports.map(async (e: any) => {
        let url = e.url;
        if (e.status === "COMPLETED" && e.url) {
          try {
            url = await getSignedUrl(e.url, 3600);
          } catch {
            url = undefined;
          }
        }
        return {
          id: e.id,
          status: e.status,
          url,
          errorMsg: e.errorMsg,
          fileSize: e.fileSize,
          format: e.format,
          resolution: e.resolution,
        };
      })
    );

    return NextResponse.json({
      exports: exportsWithUrls,
      summary: {
        total,
        completed,
        failed,
        processing,
        pending,
        progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
        allDone: pending === 0 && processing === 0,
      },
    });
  } catch (error: any) {
    console.error("[api/export/batch] GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
