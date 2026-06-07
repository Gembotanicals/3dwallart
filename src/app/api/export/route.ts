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

    // Validate image data before creating record (avoid orphaned PENDING records)
    const imageDataUrl = body.imageDataUrl || "";
    if (!imageDataUrl) {
      return NextResponse.json(
        { error: "imageDataUrl is required" },
        { status: 400 }
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

    // Create export record (only after all validation passes)
    const exportRecord = await prisma.export.create({
      data: {
        projectId,
        format,
        resolution: requestedRes,
        status: "PENDING",
      },
    });

    // Get project settings (stored as JSON in DB) and merge with defaults
    // to ensure all fields are present (older projects may be missing fields)
    const savedSettings = (project.settings || {}) as Record<string, unknown>;
    const requestSettings =
      body.settings && typeof body.settings === "object" && !Array.isArray(body.settings)
        ? (body.settings as Record<string, unknown>)
        : {};
    const rawSettings = { ...savedSettings, ...requestSettings };
    const defaultSettings: ServerReliefSettings = {
      mapMode: "brightness",
      invert: false,
      contrast: 1.15,
      smooth: 0.6,
      pw: 150,
      ph: 150,
      relief: 3,
      base: 3,
      gc: 3,
      gr: 3,
      tcol: 1,
      trow: 1,
      join: true,
      tw: 24,
      to: 6,
      tc: 0.30,
      offX: 0.10,
      offY: 0.18,
      colorOn: false,
      nc: 4,
      bandMode: "height",
      out: "PANEL",
      mw: 6,
      mr: 5,
      res: 220,
      puzzleOn: false,
      puzzleSize: 20,
      puzzleExtent: 8,
      puzzleHeadDepth: 4.5,
      puzzleEdges: "",
    };
    const settings: ServerReliefSettings = { ...defaultSettings, ...rawSettings };

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
