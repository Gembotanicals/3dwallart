import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { deleteFile, extractKeyFromUrl } from "@/lib/r2";
import { stlQueue } from "@/lib/queue";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exportRecord = await prisma.export.findUnique({
      where: { id: params.id },
      include: { project: { select: { userId: true } } },
    });

    if (!exportRecord) {
      return NextResponse.json({ error: "Export not found" }, { status: 404 });
    }

    if (exportRecord.project.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Try to get job progress from BullMQ
    let progress: number | undefined;
    if (stlQueue && exportRecord.status === "PROCESSING") {
      try {
        const jobs = await stlQueue.getJobs(["active"]);
        const activeJob = jobs.find(
          (j) => j.data?.exportId === exportRecord.id
        );
        if (activeJob) {
          progress = activeJob.progress as number;
        }
      } catch {
        // Queue might not be available, that's ok
      }
    }

    return NextResponse.json({
      id: exportRecord.id,
      status: exportRecord.status,
      url: exportRecord.url,
      errorMsg: exportRecord.errorMsg,
      progress: progress ?? undefined,
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exportRecord = await prisma.export.findUnique({
      where: { id: params.id },
      include: { project: { select: { userId: true } } },
    });

    if (!exportRecord) {
      return NextResponse.json({ error: "Export not found" }, { status: 404 });
    }

    if (exportRecord.project.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If PENDING, try to remove from queue
    if (exportRecord.status === "PENDING" && stlQueue) {
      try {
        const waitingJobs = await stlQueue.getJobs(["waiting"]);
        const job = waitingJobs.find(
          (j) => j.data?.exportId === exportRecord.id
        );
        if (job) {
          await job.remove();
        }
      } catch {
        // Queue might not be available
      }
    }

    // If COMPLETED, delete the R2 file
    if (exportRecord.status === "COMPLETED" && exportRecord.url) {
      try {
        const key = extractKeyFromUrl(exportRecord.url);
        if (key) {
          await deleteFile(key);
        }
      } catch (err) {
        console.warn("[api/export/[id]] Failed to delete R2 file:", err);
      }
    }

    // Delete the export record
    await prisma.export.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[api/export/[id]] DELETE error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
