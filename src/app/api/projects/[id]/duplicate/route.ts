import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { PLAN_LIMITS } from "@/types";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the original project (must belong to user)
    const original = await prisma.project.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!original) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check plan limits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const planLimits = PLAN_LIMITS[user.plan] || PLAN_LIMITS.FREE;

    if (planLimits.maxProjects !== -1) {
      const projectCount = await prisma.project.count({
        where: { userId: session.user.id },
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
        userId: session.user.id,
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
