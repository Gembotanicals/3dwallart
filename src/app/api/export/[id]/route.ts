import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { deleteFile, getSignedUrl } from "@/lib/r2";
import { getCurrentUserId } from "@/lib/clerk-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exportRecord = await prisma.export.findUnique({
      where: { id: params.id },
      include: { project: { select: { userId: true } } },
    });

    if (!exportRecord) {
      return NextResponse.json({ error: "Export not found" }, { status: 404 });
    }

    if (exportRecord.project.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate a pre-signed download URL for completed exports
    let downloadUrl: string | undefined;
    if (exportRecord.status === "COMPLETED" && exportRecord.url) {
      try {
        downloadUrl = await getSignedUrl(exportRecord.url, 3600); // 1 hour expiry
      } catch {
        // If signing fails, return the raw key as fallback
        downloadUrl = undefined;
      }
    }

    return NextResponse.json({
      id: exportRecord.id,
      status: exportRecord.status,
      url: downloadUrl,
      errorMsg: exportRecord.errorMsg,
      progress: undefined, // Inline mode has no progress tracking
      format: exportRecord.format,
      resolution: exportRecord.resolution,
      fileSize: exportRecord.fileSize,
      createdAt: exportRecord.createdAt,
      completedAt: exportRecord.completedAt,
    });
  } catch (error: any) {
    console.error("[api/export/[id]] GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exportRecord = await prisma.export.findUnique({
      where: { id: params.id },
      include: { project: { select: { userId: true } } },
    });

    if (!exportRecord) {
      return NextResponse.json({ error: "Export not found" }, { status: 404 });
    }

    if (exportRecord.project.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If COMPLETED, delete the R2 file (url field stores the key directly)
    let fileSizeFreed = 0;
    if (exportRecord.status === "COMPLETED" && exportRecord.url) {
      try {
        await deleteFile(exportRecord.url);
        fileSizeFreed = exportRecord.fileSize || 0;
      } catch (err) {
        console.warn("[api/export/[id]] Failed to delete R2 file:", err);
      }
    }

    // Delete the export record
    await prisma.export.delete({
      where: { id: params.id },
    });

    // Decrement user's storageUsed by the freed file size
    if (fileSizeFreed > 0) {
      await prisma.user.update({
        where: { id: exportRecord.project.userId },
        data: {
          storageUsed: {
            decrement: fileSizeFreed,
          },
        },
      }).catch((err) => {
        console.warn("[api/export/[id]] Failed to decrement storageUsed:", err);
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[api/export/[id]] DELETE error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
