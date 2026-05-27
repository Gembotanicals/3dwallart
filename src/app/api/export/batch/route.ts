import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { addExportJob } from "@/lib/queue";
import { PLAN_LIMITS } from "@/types";
import type { ServerReliefSettings } from "@/lib/relief-engine-server";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
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
      where: { id: session.user.id },
      select: { plan: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const limits = PLAN_LIMITS[user.plan] || PLAN_LIMITS.FREE;
    const requestedRes = resolution || 220;

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
      where: { id: projectId, userId: session.user.id },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const settings = project.settings as unknown as ServerReliefSettings;
    const cols = gridCols || settings.gc || 1;
    const rows = gridRows || settings.gr || 1;

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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
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
        project: { userId: session.user.id },
      },
    });

    const total = exports.length;
    const completed = exports.filter((e: { status: string }) => e.status === "COMPLETED").length;
    const failed = exports.filter((e: { status: string }) => e.status === "FAILED").length;
    const processing = exports.filter((e: { status: string }) => e.status === "PROCESSING").length;
    const pending = exports.filter((e: { status: string }) => e.status === "PENDING").length;

    return NextResponse.json({
      exports: exports.map((e: any) => ({
        id: e.id,
        status: e.status,
        url: e.url,
        errorMsg: e.errorMsg,
        fileSize: e.fileSize,
        format: e.format,
        resolution: e.resolution,
      })),
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
