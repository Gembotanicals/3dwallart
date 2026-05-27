import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUserId } from "@/lib/clerk-helpers";

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: userId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const shareLinks = await prisma.shareLink.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      links: shareLinks.map((link: any) => ({
        id: link.id,
        token: link.token,
        url: `/share/${link.token}`,
        passwordProtected: !!link.password,
        expiresAt: link.expiresAt,
        expired: link.expiresAt ? link.expiresAt < new Date() : false,
        views: link.views,
        createdAt: link.createdAt,
      })),
    });
  } catch (error) {
    console.error("GET /api/share/list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
