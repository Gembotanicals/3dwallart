import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { PLAN_LIMITS } from "@/types";

const ITEMS_PER_PAGE = 12;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const search = searchParams.get("search") || "";
    const sort = searchParams.get("sort") || "updatedAt";

    // Validate sort field
    const validSorts = ["createdAt", "updatedAt", "name"];
    const sortField = validSorts.includes(sort) ? sort : "updatedAt";
    const sortOrder = sortField === "name" ? "asc" : "desc";

    const where: any = { userId: session.user.id };
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { [sortField]: sortOrder },
        skip: (page - 1) * ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
        include: {
          _count: { select: { exports: true } },
        },
      }),
      prisma.project.count({ where }),
    ]);

    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

    return NextResponse.json({
      projects: projects.map((p: any) => ({
        ...p,
        exportCount: p._count.exports,
        _count: undefined,
      })),
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const body = await request.json();
    const name = body.name || "Untitled Project";
    const settings = body.settings || {};

    const project = await prisma.project.create({
      data: {
        userId: session.user.id,
        name,
        settings: settings as any,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
