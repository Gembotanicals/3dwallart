import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { deleteFile, extractKeyFromUrl } from "@/lib/r2";
import { getCurrentUserId } from "@/lib/clerk-helpers";

async function getProjectWithAuth(id: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id, userId },
  });
  return project;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const project = await prisma.project.findFirst({
      where: { id: params.id, userId: userId },
      include: {
        exports: { orderBy: { createdAt: "desc" } },
        shareLinks: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("GET /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await getProjectWithAuth(params.id, userId);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.thumbnailUrl !== undefined) updateData.thumbnailUrl = body.thumbnailUrl;
    if (body.stlUrl !== undefined) updateData.stlUrl = body.stlUrl;
    if (body.imageId !== undefined) updateData.imageId = body.imageId;

    // Auto-increment version on settings change
    if (body.settings !== undefined) {
      updateData.settings = body.settings;
      updateData.version = existing.version + 1;
    }

    const project = await prisma.project.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("PUT /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const project = await getProjectWithAuth(params.id, userId);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Collect all R2 keys to delete
    const filesToDelete: string[] = [];
    
    // thumbnailUrl and stlUrl store R2 keys directly (returned by uploadFile)
    if (project.thumbnailUrl) filesToDelete.push(project.thumbnailUrl);
    if (project.stlUrl) filesToDelete.push(project.stlUrl);

    // Get export records and collect their R2 keys before cascade delete
    const exports = await prisma.export.findMany({
      where: { projectId: params.id },
      select: { url: true, status: true },
    });
    
    for (const exp of exports) {
      if (exp.status === "COMPLETED" && exp.url) {
        filesToDelete.push(exp.url);
      }
    }

    // Best-effort delete all files from R2
    await Promise.allSettled(filesToDelete.map((key) => deleteFile(key)));

    // Cascade deletes handled by Prisma (onDelete: Cascade on exports and shareLinks)
    await prisma.project.delete({ where: { id: params.id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
