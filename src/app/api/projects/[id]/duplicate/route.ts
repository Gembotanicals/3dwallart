import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { PLAN_LIMITS } from "@/types";
import { getCurrentUserId } from "@/lib/clerk-helpers";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the original project (must belong to user)
    const original = await prisma.project.findFirst({
      where: { id: params.id, userId: userId },
    });

    if (!original) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check plan limits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const planLimits = PLAN_LIMITS[user.plan] || PLAN_LIMITS.FREE;

    if (planLimits.maxProjects !== -1) {
      const projectCount = await prisma.project.count({
        where: { userId: userId },
      });

      if (projectCount >= planLimits.maxProjects) {
        return NextResponse.json(
          { error: "Project limit reached", upgradeRequired: true },
          { status: 403 }
        );
      }
    }

    // Create duplicate
    const project = await prisma.project.create({
      data: {
        userId: userId,
        name: `Copy of ${original.name}`,
        settings: original.settings ?? {},
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects/[id]/duplicate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
