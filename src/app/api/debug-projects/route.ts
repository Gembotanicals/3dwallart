import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUserId } from "@/lib/clerk-helpers";

export const dynamic = "force-dynamic";

// Diagnostic endpoint to check project data
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        imageId: true,
        thumbnailUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const images = await prisma.image.findMany({
      where: { userId },
      select: {
        id: true,
        originalName: true,
        url: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      userId,
      projectsWithImageId: projects.filter(p => p.imageId).length,
      totalProjects: projects.length,
      totalImages: images.length,
      recentProjects: projects,
      recentImages: images,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
